import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });

import User from './models/User.js';
import Conversation from './models/Conversation.js';

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const all = await Conversation.find({}).populate("participants", "name email");
  
  console.log('Total conversations:', all.length);
  all.forEach((conv, i) => {
    console.log('---');
    console.log('Conversation', i + 1, 'ID:', conv._id);
    console.log('Participants:', conv.participants.map(p => p.name + ' (' + p.email + ')').join(', '));
    console.log('Messages:', conv.messages.length);
    console.log('Last message:', conv.lastMessage);
  });
  
  await mongoose.disconnect();
}).catch(err => console.error(err));
