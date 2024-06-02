const express = require('express');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());


const { MongoClient, ServerApiVersion } = require('mongodb');
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

     // JWT related api
     app.post('/jwt', async (req, res) => {
       const user = req.body;
       const token = jwt.sign(user, process.env.SECRET_TOKEN, { expiresIn: '12h' });
       res.send({ token });
     })
     
     //Get all camps from db  
     app.get('/camps', async(req,res)=>{
        const result = await campsCollection.find().toArray()
        res.send(result)
     })

    //Save a camp to db
    app.post('/camps', async(req, res)=>{
        const camp = req.body;
        const result = await campsCollection.insertOne(camp);
        res.send(result)
    })  




    await client.db("admin").command({ ping: 1 });
    console.log("Successfully connected to MongoDB!");
  } finally {
  }
}
run().catch(console.dir);

app.listen(port, ()=>{
    console.log("Medcamp Server Is Running On Port : ", port);
})