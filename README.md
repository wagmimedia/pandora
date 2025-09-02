Pandora - Your Snarky AI Guide to Lunar TradingThis project is a web-based chatbot named Pandora that provides snarky, yet helpful, insights into the "lunar trading" theory. It uses the Groq API for incredibly fast AI responses and is built with React. The frontend is designed to be deployed on Vercel.This repository contains everything you need to get Pandora running, including a landing page and the chat interface.FeaturesSnarky Personality: Pandora is trained to be witty and engaging.Real-time Crypto Data: Accesses live Bitcoin prices to provide context.Lunar Trading Knowledge: Pre-loaded with information about how moon phases are theorized to affect markets.Lightning Fast: Powered by the Groq API for near-instant responses.Simple Interface: A clean landing page that leads to a modern chat UI.Project Structure/
├── public/
│   └── index.html      # The main HTML shell for the React app
├── src/
│   ├── App.jsx         # The main React component (Landing Page + Chatbot)
│   ├── index.css       # All styles for the application
│   └── index.js        # React entry point
├── api/
│   └── chat.js         # The Vercel Serverless Function (Pandora's brain)
├── package.json        # Project configuration and dependencies
└── README.md           # You are here!
Setup and DeploymentFollow these steps to get the project running.Step 1: Clone the RepositoryFirst, get the code onto your local machine.git clone <your-repository-url>
cd <your-repository-name>
Step 2: Install DependenciesThis will install React, the Groq SDK, and all other necessary packages listed in package.json.npm install
Step 3: Set Up Environment VariablesPandora needs your Groq API key to function.For Local Development:Create a new file in the root of your project named .env.Add your Groq API key to this file like so:GROQ_API_KEY=your_actual_groq_api_key_here
For Vercel Deployment:After connecting your repository to a new Vercel project, navigate to your project's Settings.Go to the Environment Variables section.Add a new variable with the name GROQ_API_KEY and paste your Groq API key as the value.IMPORTANT: Never commit your .env file or paste your API key directly into the code. The project is already configured to ignore the .env file.Step 4: Run Locally (Optional)To test the chatbot on your own computer before deploying:npm start
This will start a development server, and you can view the app at http://localhost:3000.Step 5: Deploy to VercelPush your code to your GitHub repository. Vercel will automatically detect the changes and deploy the application. Once the deployment is complete, you will get a public URL for your live chatbot.
