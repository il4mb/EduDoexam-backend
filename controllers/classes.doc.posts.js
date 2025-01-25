const express = require('express');
const { getFirestore } = require('firebase-admin/firestore');
const { userExtractor } = require('../utils/middleware');
const { convertFirestoreData } = require('../utils/converter');
const { classParticipants, classUpdateValidator } = require('../utils/middlewares/classMiddleware');
const { getUserById } = require('../utils/helpers/user');
const router = express.Router();
const PAGE_SIZE = 10;

const postOwnerValidator = async (req, res, next) => {
    try {

        const { classId, postId } = req.params;
        const { uid } = req.user;

        const db = getFirestore();
        const postRef = db.collection("classes").doc(classId).collection("posts").doc(postId);
        const postDoc = await postRef.get();

        if (!postDoc.exists) {
            return res.status(404).json({
                error: true,
                message: "Post not found"
            })
        }

        const post = postDoc.data();
        if (post.createdBy !== uid) {
            const participantsRef = db.collection("classes").doc(classId).collection("participants");
            const participantDoc = await participantsRef.doc(uid).get();
            if (!participantDoc.exists) {
                return res.status(403).json({
                    error: true,
                    message: "You are not a participant of this class"
                })
            }
            const role = participantDoc.data().role;
            if (!["admin", "owner"].includes(role)) {
                return res.status(403).json({
                    error: true,
                    message: "You are not allowed to do this action"
                })
            }
        }

        next();

    } catch (error) {
        next(error);
    }
}

router.get("/:classId", userExtractor, classParticipants, async (req, res, next) => {
    try {
        const { classId } = req.params;
        const { pageToken } = req.query; // Page token for cursor-based pagination
        const db = getFirestore();

        let postsQuery = db.collection("classes")
            .doc(classId)
            .collection("posts")
            .orderBy("createdAt")
            .limit(PAGE_SIZE);

        // If a page token is provided, use it to paginate
        if (pageToken) {
            const lastVisible = await db.collection("classes")
                .doc(classId)
                .collection("posts")
                .doc(pageToken)
                .get();
            postsQuery = postsQuery.startAfter(lastVisible);
        }

        const postsSnapshot = await postsQuery.get();

        // Prepare the posts and participants list
        const listPost = await Promise.all(postsSnapshot.docs.map(async (doc) => {
            const data = convertFirestoreData({
                id: doc.id,
                ...doc.data()
            })
            return data;
        }));

        const participants = await Promise.all(listPost.map(post => post.createdBy)
            .filter((value, index, self) => self.indexOf(value) === index)
            .map(async (uid) => await getUserById(uid)));

        // Check if there's a next page
        const lastDoc = postsSnapshot.docs[postsSnapshot.docs.length - 1];
        const nextCursor = lastDoc ? lastDoc.id : null;

        return res.status(200).json({
            error: false,
            message: "Success fetching posts",
            data: {
                listPost,
                participants,
                nextCursor
            }
        });

    } catch (error) {
        next(error);
    }
});

router.post("/:classId", userExtractor, classParticipants, async (req, res, next) => {

    try {

        const { content, attachments } = req.body;
        const { classId } = req.params;
        const { uid } = req.user;

        const db = getFirestore();
        const postsRef = db.collection("classes").doc(classId).collection("posts");
        await postsRef.add({
            content,
            attachments: Array.isArray(attachments) ? attachments : [],
            createdAt: new Date(),
            createdBy: uid
        })
        res.status(200).json({
            error: false,
            message: "Success create post"
        })

    } catch (error) {
        next(error);
    }
})

router.delete("/:classId/:postId", userExtractor, classParticipants, postOwnerValidator, async (req, res, next) => {
    try {

        const { classId, postId } = req.params;
        const db = getFirestore();
        const postRef = db.collection("classes").doc(classId).collection("posts").doc(postId);
        await postRef.delete();

        return res.status(200).json({
            error: false,
            message: "Success delete post"
        })

    } catch (error) {
        next(error);
    }
})

router.put("/:classId/:postId", userExtractor, classParticipants, postOwnerValidator, async (req, res, next) => {
    try {
        const { classId, postId } = req.params;
        const { content, attachments } = req.body;
        const db = getFirestore();
        const postRef = db.collection("classes").doc(classId).collection("posts").doc(postId);
        postRef.update({
            content,
            attachments: Array.isArray(attachments) ? attachments : [],
            updatedAt: new Date()
        })

        return res.status(200).json({
            error: false,
            message: "Success update post"
        })

    } catch (error) {
        next(error);
    }
})


module.exports = router;