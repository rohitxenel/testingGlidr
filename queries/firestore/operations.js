const { FireStoredDb } = require('../../connections/firebase')
const admin = require('firebase-admin');


module.exports.getDocumentFromRoom = async (CollectionName, Id) => {
  try {
    const docRef = FireStoredDb.collection(CollectionName).doc(Id);
    const docSnapshot = await docRef.get();

    if (docSnapshot.exists) {
      return docSnapshot.data(); // Return the document data
    } else {
      console.log('Document does not exist.');
      return null; // Or throw an error if you prefer
    }
  } catch (error) {
    console.error('Error getting document:', error);
    throw error; // Re-throw the error to handle it at a higher level
  }
};





module.exports.GetAllData = async (CollectionName, limit = 10, lastDocId, record = "ONE") => {
  try {
    let query;
    query = FireStoredDb.collection(CollectionName)
      .orderBy('UpdatedAt', 'desc')

    if (limit !== null) {
      query = query.limit(limit);
    }


    if (lastDocId) {
      const lastDoc = await FireStoredDb.collection(CollectionName).doc(lastDocId).get();
      if (!lastDoc.exists) {
        throw new Error('Last document ID is invalid');
      }
      query = query.startAfter(lastDoc);
    }

    // Execute the query
    const snapshot = await query.get();
    if (snapshot.empty) {
      return { success: false, message: 'No documents found in the collection' };
    }
    const data = snapshot.docs.map(doc => {
      const docData = doc.data();
      console.log(docData)
      return {
        id: doc.id,
        CreatedAt: docData.CreatedAt || null,
        title: docData.title,
        description: docData.description,
        imageURL: docData.imageURL,
        Status: docData.Status,
        OwnerName: docData.OwnerName,
        phone: docData.phone,
        type: docData.type,
      };
    });

    const lastVisible = snapshot.docs[snapshot.docs.length - 1];
    const nextPageToken = lastVisible ? lastVisible.id : null;

    return { data, nextPageToken };
  } catch (error) {
    console.error("Error getting data from collection:", error);
    throw error;
  }
};




module.exports.AddDocumentWithGivenId = async (CollectionName, Id, Item) => {
  try {
    // Create a new document reference with the given ID
    const collectionRef = FireStoredDb.collection(CollectionName);
    const newDocRef = collectionRef.doc(Id);

    const saveData = await newDocRef.set({
      ...Item,
      CreatedAt: admin.firestore.Timestamp.now(),
      UpdatedAt: admin.firestore.Timestamp.now()
    });

    console.log({ saveData })
    return saveData

  } catch (error) {
    throw error;
  }
};


module.exports.UpdateTicket = async (CollectionName, Id, Item, useArrayUnion = false) => {
  try {
    const ticketDocRef = FireStoredDb.collection(CollectionName).doc(Id);

    let updatePayload;

    if (useArrayUnion) {
      // This will push to the `chats` array in Firestore
      updatePayload = {
        chats: admin.firestore.FieldValue.arrayUnion(Item),
      };
    } else {
      // This updates top-level fields like `Status`, `title`, etc.
      updatePayload = Item;
    }

    const updatedData = await ticketDocRef.update(updatePayload);
    return updatedData;
  } catch (error) {
    throw error;
  }
};

module.exports.updateById = async (CollectionName, Id, Item) => {
  try {
    // Create a new document reference with the given ID
    const ticketDocRef = FireStoredDb.collection(CollectionName).doc(Id);

    const updatedata = await ticketDocRef.update({
      chats: admin.firestore.FieldValue.arrayUnion(Item),
    });
    return updatedata
  } catch (error) {
    throw error;
  }
};

module.exports.getDocumentsByPrefix = async (collectionName, prefix, limit = 10, lastDocId = null) => {
  try {


    let query = FireStoredDb.collection(collectionName)
      .orderBy(admin.firestore.FieldPath.documentId())
      .startAt(prefix)
      .endAt(prefix + '\uf8ff'); // '\uf8ff' ensures it matches anything starting with the prefix


    if (lastDocId) {
      const lastDoc = await FireStoredDb.collection(collectionName).doc(lastDocId).get();
      if (!lastDoc.exists) {
        throw new Error('The provided last document ID is invalid.');
      }
      query = query.startAfter(lastDoc);
    }

    query = query.limit(limit);

    const snapshot = await query.get();

    if (snapshot.empty) {
      return null
    }

    // Extract document data and handle missing fields gracefully
    const data = snapshot.docs.map(doc => {
      const docData = doc.data();
      console.log(docData)
      return {
        id: doc.id,
        CreatedAt: docData.CreatedAt || null,
        title: docData.title,
        description: docData.description,
      };
    });

    // Retrieve the ID of the last visible document for pagination
    const lastVisible = snapshot.docs[snapshot.docs.length - 1];
    const nextPageToken = lastVisible ? lastVisible.id : null;

    return { success: true, data, nextPageToken };

  } catch (error) {
    console.error("Error getting documents by prefix:", error);
    throw error;
  }
};



module.exports.Updatelastonline