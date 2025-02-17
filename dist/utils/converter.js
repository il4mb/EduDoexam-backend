const { Timestamp } = require("firebase-admin/firestore");
export const convertFirestoreData = (data, filter = null) => {
    return Object.fromEntries(Object.entries(data).map(([key, value]) => [key, value instanceof Timestamp ? value.toDate() : value]).filter(([key]) => filter ? filter.includes(key) : true));
};
