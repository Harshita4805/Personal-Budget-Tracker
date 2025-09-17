const express = require('express');
const app = express();
const port = process.env.PORT || 5000;
const cors = require('cors');
const mongoose = require('mongoose');

app.use(cors());
app.use(express.json());

// MongoDB connection URI - replace with your actual MongoDB URI
const mongoURI = 'mongodb://127.0.0.1:27017/personal-budget-tracker';
mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('Connected to MongoDB'))
    .catch((err) => console.error('MongoDB connection error:', err));

// Schemas and Models
const transactionSchema = new mongoose.Schema({
    type: { type: String, enum: ['income', 'expense'], required: true },
    category: { type: String, required: true },
    amount: { type: Number, required: true, min: 0 },
    date: { type: Date, required: true },
    notes: { type: String }
});

const groupSchema = new mongoose.Schema({
    name: { type: String, required: true },
    participants: [String],
    expenses: [{
        description: String,
        amount: Number,
        paidBy: String,
        splitBetween: [String],
        splitAmounts: [Number],
        date: Date
    }],
    settlements: [{
        from: String,
        to: String,
        amount: Number,
        date: Date
    }]
});

const Transaction = mongoose.model('Transaction', transactionSchema);
const Group = mongoose.model('Group', groupSchema);

// Routes

// Get all transactions
app.get('/api/transactions', async (req, res) => {
    try {
        const transactions = await Transaction.find().sort({ date: -1 });
        res.json(transactions);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Add a transaction
app.post('/api/transactions', async (req, res) => {
    try {
        const { type, category, amount, date, notes } = req.body;
        const transaction = new Transaction({ type, category, amount, date, notes });
        await transaction.save();
        res.status(201).json(transaction);
    } catch (err) {
        res.status(400).json({ error: 'Invalid data' });
    }
});

// Delete a transaction
app.delete('/api/transactions/:id', async (req, res) => {
    try {
        await Transaction.findByIdAndDelete(req.params.id);
        res.json({ message: 'Transaction deleted' });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Group routes

// Create group
app.post('/api/groups', async (req, res) => {
    try {
        const { name, participants } = req.body;
        const group = new Group({ name, participants: participants.split(',').map(p => p.trim()), expenses: [], settlements: [] });
        await group.save();
        res.status(201).json(group);
    } catch (err) {
        res.status(400).json({ error: 'Invalid data' });
    }
});

// Get groups
app.get('/api/groups', async (req, res) => {
    try {
        const groups = await Group.find();
        res.json(groups);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Get single group by ID
app.get('/api/groups/:id', async (req, res) => {
    try {
        const group = await Group.findById(req.params.id);
        if (!group) return res.status(404).json({ error: 'Group not found' });
        res.json(group);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Add group expense
app.post('/api/groups/:id/expenses', async (req, res) => {
    try {
        const group = await Group.findById(req.params.id);
        if (!group) return res.status(404).json({ error: 'Group not found' });

        const { description, amount, paidBy, splitBetween, splitAmounts, date } = req.body;
        if (splitBetween.length !== splitAmounts.length)
            return res.status(400).json({ error: 'splitBetween and splitAmounts must have same length' });

        group.expenses.push({ description, amount, paidBy, splitBetween, splitAmounts, date: date || new Date() });
        await group.save();
        res.status(201).json(group);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Add group settlement
app.post('/api/groups/:id/settlements', async (req, res) => {
    try {
        const group = await Group.findById(req.params.id);
        if (!group) return res.status(404).json({ error: 'Group not found' });

        const { from, to, amount, date } = req.body;

        group.settlements.push({ from, to, amount, date: date || new Date() });
        await group.save();
        res.status(201).json(group);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
