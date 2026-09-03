# Wispr

Wispr combines realtime chat with a property marketplace.

## Local setup

Requirements: Node.js 20+, MongoDB, a Mapbox access token, and Cloudinary credentials.

1. Install backend dependencies:
   ```sh
   cd backend
   npm install
   cp .env.example .env
   ```
2. Fill in `backend/.env` with your MongoDB connection and service credentials.
3. Install frontend dependencies:
   ```sh
   cd ../frontend
   npm install --legacy-peer-deps
   cp .env.example .env
   ```
4. Start the backend:
   ```sh
   cd ../backend
   npm start
   ```
5. Start the frontend in another terminal:
   ```sh
   cd frontend
   npm start
   ```

Open `http://localhost:3000`.

## Main flows

Register or sign in, create a listing, open its detail page, edit or delete listings you own, message a host, and post reviews. Chat supports realtime messages, typing indicators, read receipts, favorites, and archived conversations.

## Notes

- Never commit `.env` files or service credentials.
- `npm install --legacy-peer-deps` is currently needed because `react-day-picker@8` declares compatibility with `date-fns` 2 or 3 while this project declares `date-fns` 4.
- The frontend production build is `npm run build`.
