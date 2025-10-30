import { getStorage, ref, uploadBytes, getDownloadURL } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js';
import { doc, updateDoc, arrayUnion } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { app } from './firebase-config.js';
import { db } from './firestore-service.js';
import { handleError } from './error-handler.js';

const storage = getStorage(app);

/**
 * Uploads a file for a specific contract and updates the contract document with the file's URL.
 * @param {string} contractId - The ID of the contract.
 * @param {File} file - The file to upload.
 * @returns {Promise<string|null>} A promise that resolves with the download URL of the uploaded file, or null on error.
 */
export async function uploadContractFile(contractId, file) {
    if (!contractId || !file) {
        handleError(new Error('Contract ID and file are required for upload.'), 'Upload Contract File');
        return null;
    }

    const filePath = `contracts/${contractId}/${Date.now()}_${file.name}`;
    const storageRef = ref(storage, filePath);

    try {
        console.log(`Uploading file to: ${filePath}`);
        const snapshot = await uploadBytes(storageRef, file);
        console.log('Uploaded a blob or file!', snapshot);

        const downloadURL = await getDownloadURL(snapshot.ref);
        console.log('File available at', downloadURL);

        // Now, update the contract document in Firestore
        const contractRef = doc(db, 'contracts', contractId);
        await updateDoc(contractRef, {
            attachments: arrayUnion({
                name: file.name,
                url: downloadURL,
                path: filePath,
                uploadedAt: new Date()
            })
        });

        console.log('Contract document updated with new attachment.');
        return downloadURL;

    } catch (error) {
        handleError(error, 'Upload Contract File');
        return null;
    }
}
