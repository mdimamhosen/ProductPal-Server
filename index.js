const express = require("express");
const app = express();
require("dotenv").config();
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const port = process.env.PORT || 3002;

// Set CORS options
const corsOptions = {
  origin: [
    "http://localhost:3000",
    "http://localhost:3001",
    "https://productpal-online-store-02.web.app",
    "https://productpal-online-store-02.firebaseapp.com",
  ],
  credentials: true,
  optionSuccessStatus: 200,
};
app.use(cors(corsOptions));
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.wahes.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // await client.connect();
    // Access the database and collections
    const database = client.db("productpal");
    const Product = database.collection("products");

    console.log("Connected to MongoDB");
    app.get("/products", async (req, res) => {
      try {
        const {
          category,
          brandName,
          minPrice,
          maxPrice,
          sortBy,
          order,
          search,
        } = req.query;

        // Construct the query object
        const query = {};
        if (category) query.category = category;
        if (brandName) query.brandName = brandName;
        if (minPrice || maxPrice) {
          query.price = {};
          if (minPrice) query.price.$gte = parseFloat(minPrice);
          if (maxPrice) query.price.$lte = parseFloat(maxPrice);
        }
        if (search) {
          query.$or = [
            { name: { $regex: new RegExp(search, "i") } },
            { brandName: { $regex: new RegExp(search, "i") } },
            { description: { $regex: new RegExp(search, "i") } },
          ];
        }

        // Construct the sort object
        const sort = {};
        if (sortBy) {
          sort[sortBy] = order === "desc" ? -1 : 1;
        }

        // Query the database
        const products = await Product.find(query).sort(sort).toArray();
        console.log(products);
        // Send the response
        res.json(products);
      } catch (err) {
        console.error(err);
        res.status(500).json({ msg: err.message });
      }
    });

    app.get("/test", async (req, res) => {
      try {
        const products = Product.find({});
        const curson = await products.toArray();
        res.json(curson);
      } catch (err) {
        console.error(err);
        res.status(500).json({ msg: err.message });
      }
    });

    app.get("/productDetails/:_id", async (req, res) => {
      try {
        const { _id } = req.params;
        if (!ObjectId.isValid(_id)) {
          return res.status(400).json({ message: "Invalid Product ID" });
        }

        const productId = new ObjectId(_id);
        const product = await Product.findOne({ _id: productId });
        if (!product) {
          return res.status(404).json({ message: "Product not found" });
        }
        res.json(product);
      } catch (error) {
        console.error("Error fetching product details:", error);
        res.status(500).json({ message: "Internal Server Error" });
      }
    });
    app.get("/allproducts", async (req, res) => {
      try {
        const {
          category,
          brandName,
          minPrice,
          maxPrice,
          priceRange,
          sortBy,
          order,
          search,
          page = 1,
          limit = 12,
        } = req.query;

        const filter = {};
        if (category) filter.category = category;
        if (brandName) filter.brandName = brandName;
        if (search) filter.name = { $regex: search, $options: "i" };

        if (priceRange) {
          const [priceMin, priceMax] = priceRange.split("-");
          filter.price = {
            $gte: parseFloat(priceMin),
            $lte: parseFloat(priceMax),
          };
        } else {
          if (minPrice) filter.price = { $gte: parseFloat(minPrice) };
          if (maxPrice) filter.price = { $lte: parseFloat(maxPrice) };
        }

        const sort = {};
        if (sortBy) sort[sortBy] = order === "desc" ? -1 : 1;

        const pageNumber = parseInt(page);
        const limitNumber = parseInt(limit);

        if (isNaN(pageNumber) || pageNumber <= 0) {
          return res.status(400).json({ message: "Invalid page number" });
        }
        if (isNaN(limitNumber) || limitNumber <= 0) {
          return res.status(400).json({ message: "Invalid limit number" });
        }
        const products = await Product.find(filter)
          .sort(sort)
          .skip((pageNumber - 1) * limitNumber)
          .limit(limitNumber)
          .toArray();

        const totalProducts = await Product.countDocuments(filter);
        const totalPages = Math.ceil(totalProducts / limitNumber);

        res.json({
          products,
          totalPages,
        });
      } catch (error) {
        console.error("Error fetching products:", error.message || error);
        res.status(500).json({ message: "Internal server error" });
      }
    });

    console.log("Connected to MongoDB!");
  } finally {
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello from ProductPal Server..");
});

app.listen(port, () => {
  console.log(`ProductPal server running on port ${port}`);
});
