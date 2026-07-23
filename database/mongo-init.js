db = db.getSiblingDB("taskboard");
db.createCollection("tasks");
db.tasks.insertMany([
  {
    title: "Welcome to TaskBoard",
    description: "This seed task confirms MongoDB initialized correctly.",
    completed: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
]);
