import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

dotenv.config();

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'da9x9kcjf',
    api_key: process.env.CLOUDINARY_API_KEY || '413356928313787',
    api_secret: process.env.CLOUDINARY_API_SECRET || 'E-CRaxBfb6iVHHjSICBTi8j7UB4',
});

export default cloudinary;
