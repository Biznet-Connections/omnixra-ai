import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });

import Conversation from './models/Conversation.js';

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  // Find conversations where user is talking to themselves
  const all = await Conversation.find({});
  
  let deletedCount = 0;
  for (const conv of all) {
    const participantIds = conv.participants.map(p => p.toString());
    const uniqueIds = [...new Set(participantIds)];
    
    // If duplicate participants (same person twice)
    if (participantIds.length !== uniqueIds.length) {
      await Conversation.deleteOne({ _id: conv._id });
      console.log('Deleted self-conversation:', conv._id);
      deletedCount++;
    }
  }
  
  console.log('Total deleted:', deletedCount);
  
  const remaining = await Conversation.find({});
  console.log('Remaining conversations:', remaining.length);
  
  await mongoose.disconnect();
}).catch(err => console.error(err));
