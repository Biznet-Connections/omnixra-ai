import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });

import Conversation from './models/Conversation.js';

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const result = await Conversation.deleteMany({});
  console.log('Deleted ALL conversations:', result.deletedCount);
  await mongoose.disconnect();
}).catch(err => console.error(err));
