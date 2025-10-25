"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.addTimelineLog = exports.updateAdminDocument = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
// Initialize Firebase Admin SDK
admin.initializeApp();
const db = admin.firestore();
// --- 1. SECURE ADMIN UPDATE ENDPOINT ---
exports.updateAdminDocument = functions.https.onCall(async (data, context) => {
    // 1. Authentication Check: Use context.auth securely
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Only authenticated administrators can update documents.');
    }
    // 2. Type Casting: Cast data to the expected interface
    const { collectionName, id, updates } = data;
    if (!collectionName || !id || !updates) {
        throw new functions.https.HttpsError('invalid-argument', 'The request is missing required fields (collectionName, id, updates).');
    }
    try {
        const docRef = db.collection(collectionName).doc(id);
        // Use the Admin SDK to perform the update, guaranteeing success.
        await docRef.update(updates);
        return { success: true, message: `Document ${id} updated in ${collectionName}.` };
    }
    catch (error) {
        functions.logger.error(`Error updating document ${id} in ${collectionName}:`, error);
        throw new functions.https.HttpsError('internal', 'Server failed to execute the update operation.');
    }
});
// --- 2. TIMELINE LOG ENDPOINT ---
exports.addTimelineLog = functions.https.onCall(async (data, context) => {
    // Authentication Check: Use context.auth securely
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Only authenticated administrators can add timeline entries.');
    }
    // Type Casting: Cast data to the expected interface
    const { petitionId, updateObject } = data;
    if (!petitionId || !updateObject) {
        throw new functions.https.HttpsError('invalid-argument', 'Missing petitionId or updateObject.');
    }
    const petitionRef = db.collection('petitions').doc(petitionId);
    try {
        // Use Admin SDK to safely append to the 'updates' array.
        await petitionRef.update({
            updates: admin.firestore.FieldValue.arrayUnion(updateObject)
        });
        return { success: true, message: 'Timeline updated successfully.' };
    }
    catch (error) {
        functions.logger.error(`Error adding timeline update to ${petitionId}:`, error);
        throw new functions.https.HttpsError('internal', 'Server failed to add timeline update.');
    }
});
