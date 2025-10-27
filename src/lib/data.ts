// src/lib/data.ts
import { collection, getDocs, query, orderBy, limit, doc, getDoc, updateDoc, deleteDoc, DocumentData, WithFieldValue, runTransaction, increment, arrayUnion, arrayRemove, addDoc, serverTimestamp, QueryDocumentSnapshot, startAfter } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Petition, BlogArticle, IncidentReport, ReportedComment } from "@/data/mockData";


// Utility function to map Firebase data to frontend types
const mapSnapshotToData = <T extends { [key: string]: any }>(snapshot: DocumentData, dateField: string): T[] => {
  return snapshot.docs.map(doc => {
    const data = doc.data();
    // Convert Firebase Timestamp to an ISO string for consistent use with frontend
    const date = data[dateField]?.toDate().toISOString() || new Date().toISOString();
    return {
      id: doc.id,
      ...data,
      [dateField]: date
    } as T;
  });
};

// --- MULTIPLE DOCUMENT FETCHERS ---

/** Fetches all published petitions (investigations) */
export async function fetchPetitions(): Promise<Petition[]> {
  const petitionsQuery = query(
    collection(db, "petitions"),
    orderBy("createdAt", "desc")
  );
  const snapshot = await getDocs(petitionsQuery);
  
  return mapSnapshotToData<Petition>(snapshot, "createdAt").map(p => ({
      ...p,
      supporters: p.supporters || 0,
      updates: p.updates || [],
      // Comments are fetched separately and are not expected here
  }));
}

/** * Fetches all incident reports. 
 * The triage view will filter this list to only show non-linked reports.
 */
export async function fetchIncidentReports(): Promise<IncidentReport[]> {
  let reportsQuery = query(
    collection(db, "incident_reports"),
    orderBy("submittedAt", "desc")
  );
  
  const snapshot = await getDocs(reportsQuery);
  return mapSnapshotToData<IncidentReport>(snapshot, "submittedAt");
}

/** Fetches all blog articles */
export async function fetchBlogArticles(): Promise<BlogArticle[]> {
  const articlesQuery = query(
    collection(db, "blog_articles"),
    orderBy("publishedAt", "desc")
  );
  const snapshot = await getDocs(articlesQuery);
  return mapSnapshotToData<BlogArticle>(snapshot, "publishedAt");
}

/** Fetches all reported public comments for admin review */
export async function fetchReportedComments(): Promise<ReportedComment[]> {
  const reportsQuery = query(
    collection(db, "reported_comments"),
    orderBy("reportedAt", "desc")
  );
  const snapshot = await getDocs(reportsQuery);
  return mapSnapshotToData<ReportedComment>(snapshot, "reportedAt");
}

// [NEW PAGINATED FETCH] Fetches comments from the subcollection in batches
export async function fetchCommentsPaginated(
  petitionId: string,
  lastVisible: QueryDocumentSnapshot | null // The document to start after
): Promise<{ comments: Comment[]; lastVisible: QueryDocumentSnapshot | null; hasMore: boolean }> {
  
  const commentsRef = collection(db, "petitions", petitionId, "comments"); // 🛑 NEW SUBCOLLECTION REF
  const PAGE_SIZE = 10; // Set batch size to 10

  let commentsQuery = query(
    commentsRef,
    orderBy("date", "desc"), // Order by newest first
    ...(lastVisible ? [startAfter(lastVisible)] : []), // Start after the last visible doc
    limit(PAGE_SIZE) // 🛑 CRITICAL LIMITER
  );

  const snapshot = await getDocs(commentsQuery);
  const comments = mapSnapshotToData<Comment>(snapshot, "date");
  const lastDoc = snapshot.docs[snapshot.docs.length - 1] || null;
  
  return {
    comments: comments,
    lastVisible: lastDoc,
    hasMore: snapshot.docs.length === PAGE_SIZE,
  };
}


// --- SINGLE DOCUMENT FETCHERS ---

export async function fetchPetition(id: string): Promise<Petition | undefined> {
    const docRef = doc(db, "petitions", id);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
        const data = docSnap.data();
        const createdAt = data.createdAt?.toDate().toISOString() || new Date().toISOString();
        
        return {
            id: docSnap.id,
            ...data,
            createdAt: createdAt,
            supporters: data.supporters || 0,
            updates: data.updates || [], 
            // 🛑 MODIFIED: Removed comments array from return
        } as Petition;
    } else {
        return undefined;
    }
}

export async function fetchBlogArticle(id: string): Promise<BlogArticle | undefined> {
    const docRef = doc(db, "blog_articles", id);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
        const data = docSnap.data();
        const publishedAt = data.publishedAt?.toDate().toISOString() || new Date().toISOString();
        return {
            id: docSnap.id,
            ...data,
            publishedAt: publishedAt,
        } as BlogArticle;
    } else {
        return undefined;
    }
}

// --- WRITE/EDIT OPERATIONS ---

export async function deleteDocument(collectionName: string, id: string): Promise<void> {
    const docRef = doc(db, collectionName, id);
    await deleteDoc(docRef);
}

/** Updates a document in a specified collection by ID. */
export async function updateDocument<T extends DocumentData>(collectionName: string, id: string, data: Partial<WithFieldValue<T>>): Promise<void> {
    const docRef = doc(db, collectionName, id);
    await updateDoc(docRef, data); 
}

/** Updates the status of a specific reported comment for admin tracking. */
export async function updateReportStatus(reportId: string, newStatus: 'new' | 'reviewed' | 'action_taken'): Promise<void> {
    const reportRef = doc(db, "reported_comments", reportId);
    await updateDoc(reportRef, {
        status: newStatus
    });
}

// [NEW FUNCTION] To append a new update to the timeline array
export async function addTimelineUpdate(petitionId: string, updateObject: {id: string, title: string, content: string, date: string}): Promise<void> {
    const petitionRef = doc(db, "petitions", petitionId);
    
    // We use arrayUnion for non-destructive array appending
    await updateDoc(petitionRef, {
        updates: arrayUnion(updateObject)
    });
}

// 🛑 MODIFIED: Add comment now uses the SUBCOLLECTION
export async function addPublicComment(petitionId: string, author: string, content: string): Promise<void> {
    const commentsRef = collection(db, "petitions", petitionId, "comments"); // 🛑 NEW SUBCOLLECTION REF
    
    // Add the document directly to the subcollection
    await addDoc(commentsRef, {
        author: author,
        content: content,
        date: serverTimestamp(), // Use server timestamp for precise ordering
        isClaimant: false, 
    });
}

// 🛑 MODIFIED: Delete comment now uses the SUBCOLLECTION deleteDoc
export async function deleteCommentFromPetition(petitionId: string, commentObject: any): Promise<void> {
    const commentRef = doc(db, "petitions", petitionId, "comments", commentObject.id); // 🛑 NEW DOC REF
    
    // Use deleteDoc on the specific subcollection document
    await deleteDoc(commentRef); 
}

// [NEW FUNCTION] To log a report about an abusive public comment
export async function reportComment(
    petitionId: string, 
    commentId: string, 
    reporterName: string, 
    reason: string
): Promise<void> {
    const reportsRef = collection(db, "reported_comments");
    
    await addDoc(reportsRef, {
        petitionId: petitionId,
        commentId: commentId,
        reporterName: reporterName,
        reason: reason,
        reportedAt: serverTimestamp(),
        status: 'new' // 'new', 'reviewed', 'action_taken'
    });
}


// --- VERIFIED CLAIMANT WORKFLOW FUNCTIONS ---

/**
 * [UPDATE/LINK] Atomically links an Incident Report to a Petition.
 */
export async function linkReportToPetition(
    reportId: string, 
    petitionId: string, 
    reportData: IncidentReport
): Promise<void> {
    const reportRef = doc(db, "incident_reports", reportId);
    const petitionRef = doc(db, "petitions", petitionId);

    await runTransaction(db, async (transaction) => {
        const petitionSnap = await transaction.get(petitionRef);
        if (!petitionSnap.exists()) {
            throw new Error("Petition does not exist! Cannot link report."); 
        }
        
        const claimantComment = {
            id: reportId, 
            author: "Verified Claimant", 
            content: `Claimant Report Linked: ${reportData.issueDescription.substring(0, 50)}${reportData.issueDescription.length > 50 ? '...' : ''}`,
            date: new Date().toISOString(),
            isClaimant: true,
            originalReportId: reportId, 
            petitionId: petitionId,
            claimantName: reportData.name,
            claimantEmail: reportData.email,
        };
        
        const currentComments = petitionSnap.data().comments || [];

        // 1. Update Petition: Increment supporter count and add claimant record (in the main array)
        transaction.update(petitionRef, {
            supporters: increment(1), 
            comments: [...currentComments, claimantComment],
        });

        // 2. Update Incident Report: Mark it as linked
        transaction.update(reportRef, {
            status: "Linked",
            petitionId: petitionId, 
        });
    });
}


/**
 * [DELETE/UNLINK] Atomically reverses the link, decrementing the supporter count 
 */
export async function unlinkClaimantFromPetition(
    petitionId: string, 
    claimantComment: any, 
    reportId: string 
): Promise<void> {
    const petitionRef = doc(db, "petitions", petitionId);
    const reportRef = doc(db, "incident_reports", reportId);

    await runTransaction(db, async (transaction) => {
        const petitionSnap = await transaction.get(petitionRef);
        if (!petitionSnap.exists()) {
            throw new Error("Petition does not exist! Cannot unlink report."); 
        }

        // 1. Update Petition: Decrement supporter count and remove the exact comment object
        transaction.update(petitionRef, {
            supporters: increment(-1), 
            comments: arrayRemove(claimantComment), 
        });

        // 2. Delete the original Incident Report document 
        transaction.delete(reportRef);
    });
}