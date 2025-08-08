import React from "react";
import HeadlineFeed from "./components/HeadlineFeed";
import LoginButton from "./components/LoginButton"; // Adjust path if needed

function App() {
  return (
    <div className="App">
      <header className="p-4 bg-white shadow-sm flex justify-between items-center">
        <h1 className="text-xl font-bold text-gray-800">Nouns Auction Tracker</h1>
      </header>
      <main>
        <HeadlineFeed />
      </main>
    </div>
  );
}

export default App;
