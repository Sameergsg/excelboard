import dotenv from 'dotenv';
dotenv.config();
import { migrate } from './database';
migrate();
