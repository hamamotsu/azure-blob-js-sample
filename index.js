// index.js
const { BlobServiceClient, ContainerClient } = require("@azure/storage-blob");
// Now do something interesting with BlobServiceClient

const createContainerButton = document.getElementById("create-container-button");
const deleteContainerButton = document.getElementById("delete-container-button");
const selectButton = document.getElementById("select-button");
const fileInput = document.getElementById("file-input");
const listButton = document.getElementById("list-button");
const deleteButton = document.getElementById("delete-button");
const status = document.getElementById("status");
const fileList = document.getElementById("file-list");
const userInput = document.getElementById("user-input");

const reportStatus = message => {
    status.innerHTML += `${message}<br/>`;
    status.scrollTop = status.scrollHeight;
}

// Update <placeholder> with your Blob service SAS URL string
const blobSasUrl = "<blob-sas>";
const containerSasUrl = "<container-sas>";

// Create a new BlobServiceClient
const blobServiceClient = new BlobServiceClient(blobSasUrl);

// Create a unique name for the container by 
// appending the current time to the file name
//const containerName = "container" + new Date().getTime();
const containerName = "testcontainer";

// Get a container client from the BlobServiceClient
// const containerClient = blobServiceClient.getContainerClient(containerName);
const containerClient = new ContainerClient(containerSasUrl)

// Create and Delete blob bontainer
const createContainer = async () => {
    try {
        if (await containerClient.exists()) {
            reportStatus(`Exists container.`);
            return;
        }
        reportStatus(`Creating container "${containerName}"...`);
        await containerClient.create();
        reportStatus(`Done.`);
    } catch (error) {
        reportStatus(error.message);
    }
};

const deleteContainer = async () => {
    try {
        reportStatus(`Deleting container "${containerName}"...`);
        await containerClient.delete();
        reportStatus(`Done.`);
    } catch (error) {
        reportStatus(error.message);
    }
};

createContainerButton.addEventListener("click", createContainer);
deleteContainerButton.addEventListener("click", deleteContainer);

// list blob
const listFiles = async () => {
    fileList.size = 0;
    fileList.innerHTML = "";
    try {
        reportStatus("Retrieving file list...");
        if (!userInput.value) {
            let iter = containerClient.listBlobsFlat();
            let blobItem = await iter.next();
            while (!blobItem.done) {
                fileList.size += 1;
                fileList.innerHTML += `<option>${blobItem.value.name}</option>`;
                blobItem = await iter.next();
            }
        } else {
            // const blobListOption = { prefix: userInput.value + '/' };
            // for await (const item of containerClient.listBlobsFlat(blobListOption)) {
            //     fileList.innerHTML += `<option>${item.name}</option>`;
            // }
            const blobListOption = { prefix: userInput.value + '/' };
            for await (const item of containerClient.listBlobsByHierarchy("/", blobListOption)) {
                if (item.kind === "prefix") {
                    console.log(`\tBlobPrefix: ${item.name}`);
                    fileList.innerHTML += `<option>${item.name}</option>`;
                } else {
                    fileList.size += 1;
                    console.log(`\tBlobItem: name - ${item.name}, last modified - ${item.properties.lastModified}`);
                    fileList.innerHTML += `<option>${item.name}</option>`;
                }
            }
        }
        if (fileList.size > 0) {
            reportStatus("Done.");
        } else {
            reportStatus("The container does not contain any files.");
        }

    } catch (error) {
        reportStatus(error.message);
    }
};

listButton.addEventListener("click", listFiles);

// upload blob
const uploadFiles = async () => {
    try {
        const userName = userInput.value;
        reportStatus("Uploading files...");
        const promises = [];
        for (const file of fileInput.files) {
            const fileName = userName + "/" + file.name;
            const blockBlobClient = containerClient.getBlockBlobClient(fileName);
            promises.push(blockBlobClient.uploadBrowserData(file));
        }
        await Promise.all(promises);
        reportStatus("Done.");
        listFiles();
    }
    catch (error) {
            reportStatus(error.message);
    }
}

selectButton.addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", uploadFiles);

// delete blob
const deleteFiles = async () => {
    try {
        if (fileList.selectedOptions.length > 0) {
            reportStatus("Deleting files...");
            for (const option of fileList.selectedOptions) {
                await containerClient.deleteBlob(option.text);
            }
            reportStatus("Done.");
            listFiles();
        } else {
            reportStatus("No files selected.");
        }
    } catch (error) {
        reportStatus(error.message);
    }
};

deleteButton.addEventListener("click", deleteFiles);