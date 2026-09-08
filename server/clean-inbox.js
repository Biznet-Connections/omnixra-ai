import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });

import Conversation from './models/Conversation.js';

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const all = await Conversation.find({});
  console.log('Total conversations before cleanup:', all.length);

  // 1. Delete empty conversations (no messages)
  const emptyConvs = all.filter(c => !c.messages || c.messages.length === 0);
  if (emptyConvs.length > 0) {
    await Conversation.deleteMany({ _id: { $in: emptyConvs.map(c => c._id) } });
    console.log('Deleted empty conversations:', emptyConvs.length);
  }

  // 2. Delete duplicate conversations (same participants)
  const seen = new Map();
  const duplicates = [];
  const remaining = await Conversation.find({});
  
  remaining.forEach(conv => {
    const sortedParticipants = [...conv.participants].map(p => p.toString()).sort().join('_');
    if (seen.has(sortedParticipants)) {
      // Keep the one with most recent activity
      const existing = seen.get(sortedParticipants);
      const existingLast = existing.lastMessageAt || new Date(0);
      const convLast = conv.lastMessageAt || new Date(0);
      if (convLast > existingLast) {
        duplicates.push(existing._id);
        seen.set(sortedParticipants, conv);
      } else {
        duplicates.push(conv._id);
      }
    } else {
      seen.set(sortedParticipants, conv);
    }
  });

  if (duplicates.length > 0) {
    await Conversation.deleteMany({ _id: { $in: duplicates } });
    console.log('Deleted duplicate conversations:', duplicates.length);
  }

  const final = await Conversation.find({});
  console.log('Total conversations after cleanup:', final.length);
  console.log('Done!');
  
  await mongoose.disconnect();
}).catch(err => console.error(err));
