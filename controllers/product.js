const routers = require('express').Router();
const { getAdmin } = require("../utils/firebase");
getAdmin()

const { getFirestore } = require('firebase-admin/firestore');

routers.get("/price-list", async (req, res, next) => {
    try {
        const db = getFirestore();

        // Fetching packages collection
        const packagesRef = db.collection("packages");
        const snapshotPackages = await packagesRef.get();

        if (snapshotPackages.empty) {
            return res.status(404).json({
                error: true,
                message: "No packages found."
            });
        }

        const packages = snapshotPackages.docs.map(doc => {
            const data = doc.data();

            // Filter to extract only required attributes
            return {
                id: doc.id,
                label: data.label || "No label",
                maxParticipant: data.maxParticipant || 0,
                maxQuestion: data.maxQuestion || 0,
                price: data.price || 0,
                freeQuota: data.freeQuota || 0
            };
        });
        packages.sort(function (a, b) {
            return a.price - b.price;
        })

        // Fetching pricing collection
        const pricingRef = db.collection("pricing").doc("default");
        const snapshotPricing = await pricingRef.get(); // Fetch the default pricing document

        // Checking if the pricing document exists
        if (!snapshotPricing.exists) {
            return res.status(404).json({
                error: true,
                message: "Pricing data not found."
            });
        }

        const pricing = snapshotPricing.data(); // Get the pricing data

        // Respond with the packages and pricing data
        res.status(200).json({
            error: false,
            message: "Success",
            data: {
                packages: packages,
                pricing: pricing
            }
        });

    } catch (error) {
        console.error("Error fetching price list:", error);
        next(error);
    }
});


routers.put("/:userId", async (req, res, next) => {
    try {
        const { userId } = req.params;
        const { packageId, quota } = req.body;

        console.log(req.body)

        const quotaInt = parseInt(quota);
        const db = getFirestore();
        const userRef = db.collection("users").doc(userId);
        const userDoc = await userRef.get();

        // Check if user exists
        if (!userDoc.exists) {
            return res.status(404).json({
                error: true,
                message: "User not found."
            });
        }

        const userData = userDoc.data();
        const currentUserQuota = userData.quota || 0;

        const updates = { quota: currentUserQuota + quotaInt };

        if (packageId) {
            const packageRef = db.collection("packages").doc(packageId);
            const packageDoc = await packageRef.get();

            // Check if package exists
            if (!packageDoc.exists) {
                return res.status(404).json({
                    error: true,
                    message: "Package not found."
                });
            }

            updates.package = packageId;
        }

        console.log(updates)

        // Update user data
        await userRef.update(updates);

        res.status(200).json({
            error: false,
            message: "User package and quota have been updated successfully."
        });
    } catch (error) {
        console.error("Error updating user package and quota:", error);
        next(error);
    }
});



module.exports = routers;