import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const User = (await import('./models/User.js')).default;
  const Conversation = (await import('./models/Conversation.js')).default;
  
  const user = await User.findOne({});
  if (user) {
    const conversations = await Conversation.find({ participants: user._id });
    let unreadCount = 0;
    conversations.forEach(conv => {
      conv.messages.forEach(msg => {
        if (msg.sender.toString() !== user._id.toString() && !msg.readBy.includes(user._id)) {
          unreadCount++;
          console.log('Unread message:', msg.text, 'from', msg.sender);
        }
      });
    });
    console.log('User:', user.name);
    console.log('Total conversations:', conversations.length);
    console.log('Unread messages:', unreadCount);
  } else {
    console.log('No users found');
  }
  await mongoose.disconnect();
}).catch(err => console.error(err));
