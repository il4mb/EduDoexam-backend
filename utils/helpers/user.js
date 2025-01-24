const { getFirestore } = require("firebase-admin/firestore");
const { getFileUrl } = require("../cloudStorage");

const getUserById = async (id, props = ["id", "name", "photo"]) => {
    const db = getFirestore();

    const doc = await db.collection("users").doc(id).get();

    if (!doc.exists) {
        return null; // Return null if the document does not exist
    }

    // Filter the returned data to include only specified properties
    const data = doc.data();
    const filteredData = Object.fromEntries(
        Object.entries(data).filter(([key]) => props.includes(key))
    );
    if (props.find(v => v === "photo")) {
        filteredData.photo = await getFileUrl(`/uploads/profile/${id}.jpg`)
    }

    // Ensure the ID is included
    return { id: doc.id, ...filteredData };
};

module.exports = {
    getUserById
}