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
    mongo.connect(process.env.MONGO_URI, conn);

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
    let today = req.body.date.match(/^\d{4}-\d{2}-\d{2}$/) ?
        new Date(req.body.date) :
        new Date();
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
                    exercises.unshift(exercise);
                    exercises = exercises.sort((a, b) => {
                        return new Date(a.date) > new Date(b.date);
                    });
                    collectn.updateOne({ username: username }, { $set: { exercises: exercises } });
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
app.get("/api/exercise/log", (req, res) => {
    if (req.query.username) {
        const username = req.query.username;
        let from = null;
        let to = null;
        let limit = 0;
        if (req.query.from) {
            from = new Date(req.query.from);
            if (from == "Invalid Date") {
                res.status(401).send("Invalid date format in from parameter");
            }
        }
        if (req.query.to) {
            to = new Date(req.query.to);
            if (to == "Invalid Date") {
                res.status(401).send("Invalid date format in to parameter");
            }
        }
        if (req.query.limit) {
            limit = req.query.limit;
        }
        if (from != "Invalid Date" && to != "Invalid Date") {
            mongoExec(["exercise-tracker"], collectn => {
                collectn.findOne({ username: username }, (err, result) => {
                    if (err) throw err;
                    if (result) {
                        let exercises = result.exercises.filter(elem => {
                            if (from && to)
                                return new Date(elem.date) >= from && new Date(elem.date) <= to;
                            else if (from) return new Date(elem.date) >= from;
                            else if (to) return new Date(elem.date) <= to;
                            else return elem;
                        });
                        if (limit > 0) {
                            exercises = exercises.slice(0, limit);
                        }
                        res.status(200).json({
                            username: username,
                            from: from ? from.toDateString() : "",
                            to: to ? to.toDateString() : "",
                            limit: limit == 0 ? "" : limit,
                            exercises: exercises
                        });
                    }
                });
            });
        }
    } else {
        res.status(401).send("username parameter is mandatory");
    }
});
app.listen(process.env.PORT || 3000, () => {
    console.log("Your app is listening on port " + process.env.PORT);
});