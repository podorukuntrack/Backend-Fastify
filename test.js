import bcrypt from 'bcrypt';

const hash = await bcrypt.hash('123456', 10);
console.log(hash);