const express = require("express");
const app = express();
const bodyParser = require("body-parser");
require("dotenv/config");
const cors = require("cors");
const mongo = require("mongodb").MongoClient;

app.use(cors());

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(express.static("public"));

function mongoExec(collectionNames, callback) {
  mongo.connect(
    process.env.MONGO_URI,
    conn
  );
  function conn(err, client) {
    if (err) {
      throw err;
    } else {
      let db = client.db("gotohell");
      let collectn = db.collection(collectionNames[0]);
      if (collectionNames.length > 1) {
        let collectn2 = db.collection(collectionNames[1]);
        callback(collectn, collectn2);
      } else {
        callback(collectn);
      }
    }
  }
}
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});
app.post("/api/exercise/new-user", (req, res) => {
  const username = req.body.username;
  mongoExec(["exercise-tracker"], collectn => {
    collectn.findOne({ username: username }, (err, result) => {
      if (err) throw err;
      if (!result) {
        collectn.insertOne({ username: username, exercises: [] });
        res.status(200).send("User " + username + " signed up successfully!!");
      } else {
        res.status(404);
        res.send("Username exist!!");
      }
    });
  });
});
app.post("/api/exercise/add", (req, res) => {
  const username = req.body.username;
  let today = req.body.date.match(/^\d{4}-\d{2}-\d{2}$/)
    ? new Date(req.body.date)
    : new Date();
  const exercise = {
    description: req.body.description,
    duration: req.body.duration,
    date: today.toDateString() // yyyy-mm-dd format
  };
  if (exercise.description.length == 0) {
    res.status(401).send("Description is required");
  } else if (exercise.duration.length == 0) {
    res.status(401).send("Duration is required");
  } else {
    mongoExec(["exercise-tracker"], collectn => {
      collectn.findOne({ username: username }, (err, result) => {
        if (err) throw err;
        if (result) {
          let exercises = result.exercises;
          exercises.push(exercise);
          collectn.updateOne(
            { username: username },
            { $set: { exercises: exercises } }
          );
          res.status(200).json({
            username: username,
            exercises: exercises
          });
        } else {
          res.status(403).send("Invalid Username");
        }
      });
    });
  }
});
app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + process.env.PORT);
});
