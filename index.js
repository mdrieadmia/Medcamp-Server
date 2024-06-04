const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const express = require('express');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.cricab9.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    await client.connect();

    // DB Collections
    const campsCollection = client.db("medcamp").collection("camps")
    const usersCollection = client.db("medcamp").collection("users")
    const registeredCollection = client.db("medcamp").collection("registered")

    // Verify Token
    const verifyToken = (req, res, next) => {
      if (!req.headers.authorization) {
        return res.status(401).send({ message: 'Unauthorized Access' });
      }
      const token = req.headers.authorization.split(' ')[1];
      jwt.verify(token, process.env.SECRET_TOKEN, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: 'Unauthorized Access' })
        }
        req.decoded = decoded;
        next();
      })
    }

    // Verify Organizer
    const verifyOrganizer = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      if (!(user.role === "organizer")) {
        return res.status(403).send({ message: 'forbidden access' });
      }
      next();
    }

    // Check Organizer
    app.get('/organizer/:email', verifyToken, async (req, res) => {
      const email = req.params.email;

      if (email !== req.decoded.email) {
        return res.status(403).send({ message: 'forbidden access' })
      }

      const user = await usersCollection.findOne({ email });
      let organizer;
      if (user.role === 'organizer') {
        organizer = true;
      } else {
        organizer = false;
      }
      res.send({ organizer });
    })

    // JWT related api
    app.post('/jwt', async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.SECRET_TOKEN, { expiresIn: '12h' });
      res.send({ token });
    })

    // User related api
    // Get organizer profile data
    app.get('/user-organizer/:email', verifyToken, verifyOrganizer, async (req, res) => {
      const email = req.params.email;
      const result = await usersCollection.findOne({ email })
      res.send(result)
    })

    // Get participant profile data
    app.get('/user-participant/:email', verifyToken, async (req, res) => {
      const email = req.params.email;
      const result = await usersCollection.findOne({ email })
      res.send(result)
    })

    // Update user data in db
    app.patch('/user/:email', verifyToken, async(req, res)=>{
      const email = req.params.email;
      const query = {email}
      const userData = req.body;
      const updateDoc = {
        $set : {
          ...userData
        }
      }
      const result = await usersCollection.updateOne(query, updateDoc)
      res.send(result)
    })

    //Find a uesr in users collection and saved data
    app.post('/users', async (req, res) => {
      const user = req.body
      const isExist = await usersCollection.findOne({ email: user.email })
      if (isExist) {
        return res.send({ message: "User already exist", insertedId: null })
      }
      const result = usersCollection.insertOne(user)
      res.send(result)
    })

    app.get('/', async (req, res) => {
      res.send("Medcamp server is running...")
    })

    //Get all camps from db  
    app.get('/camps', async (req, res) => {
      const result = await campsCollection.find().toArray()
      res.send(result)
    })

    //Get single camp details from db  
    app.get('/camp/details/:id', verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await campsCollection.findOne(query)
      res.send(result)
    })

    //Save a camp to db
    app.post('/camps', verifyToken, async (req, res) => {
      const camp = req.body;
      const result = await campsCollection.insertOne(camp);
      res.send(result)
    })

    // Delete a camp from db
    app.delete('/camp/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await campsCollection.deleteOne(query)
      res.send(result)
    })

    //Update a camp to db
    app.patch('/camp/:id', async (req, res) => {
      const id = req.params.id
      const camp = req.body;
      const query = { _id: new ObjectId(id) }
      const updateDoc = {
        $set: {
          ...camp
        }
      }
      const result = await campsCollection.updateOne(query, updateDoc);
      res.send(result)
    })

    // save new participant data to db
    app.post('/registered', verifyToken, async(req, res)=>{
      const newRegistered = req.body;
      const result = await registeredCollection.insertOne(newRegistered)
      res.send(result)
    })

    // Increment registered count 
    app.patch('/increment-register/:id', verifyToken, async(req, res)=>{
      const id = req.params.id;
      const totalParticipant = req.body.participantCount;
      const query = {_id : new ObjectId(id)}
      const updateDoc = {
        $set : {
          participantCount : totalParticipant + 1
        }
      }
      const result = await campsCollection.updateOne(query, updateDoc)
      res.send(result)
    })





    await client.db("admin").command({ ping: 1 });
    console.log("Successfully connected to MongoDB!");
  } finally {
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log("Medcamp Server Is Running On Port : ", port);
})