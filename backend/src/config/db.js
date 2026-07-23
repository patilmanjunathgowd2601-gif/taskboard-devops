const mongoose = require("mongoose");

async function connectDB(uri) {
  mongoose.set("strictQuery", true);

  const maxRetries = 10;
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
      console.log("[db] connected to MongoDB");
      return;
    } catch (err) {
      attempt += 1;
      const backoffMs = Math.min(1000 * attempt, 5000);
      console.error(`[db] attempt ${attempt}/${maxRetries} failed: ${err.message}. Retrying in ${backoffMs}ms`);
      await new Promise((resolve) => setTimeout(resolve, backoffMs));
    }
  }

  throw new Error("[db] could not connect to MongoDB after max retries");
}

module.exports = { connectDB };
