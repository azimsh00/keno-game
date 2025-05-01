import React, { useState } from 'react';
import './App.css';

function App() {
    // State for selected numbers
    const [selectedNumbers, setSelectedNumbers] = useState([]);

    // State for bet amount
    const [betAmount, setBetAmount] = useState('100.00');

    // State for risk level
    const [riskLevel, setRiskLevel] = useState('Classic');

    // State for manual/auto toggle
    const [betMode, setBetMode] = useState('Manual');

    // State for user balance
    const [balance, setBalance] = useState(10000.00);

    // State for compact result display
    const [showCompactResult, setShowCompactResult] = useState(false);
    const [resultData, setResultData] = useState({
        winAmount: 0,
        matchedNumbers: [],
        drawnNumbers: []
    });

    // State for draw animation
    const [isDrawing, setIsDrawing] = useState(false);
    const [drawnResults, setDrawnResults] = useState([]);
    const [drawCount, setDrawCount] = useState(0);

    // Generate numbers 1-40 for the Keno board
    const generateNumbers = () => {
        const numbers = [];
        for (let i = 1; i <= 40; i++) {
            numbers.push(i);
        }
        return numbers;
    };

    // Handle number selection
    const handleNumberSelect = (number) => {
        if (selectedNumbers.includes(number)) {
            // Remove number if already selected
            setSelectedNumbers(selectedNumbers.filter(num => num !== number));
        } else if (selectedNumbers.length < 10) {
            // Add number if not already selected and less than 10 numbers are selected
            setSelectedNumbers([...selectedNumbers, number]);
        }
        // If 10 numbers are already selected, do nothing (silent handling)
    };

    // Auto pick random numbers
    const handleAutoPick = () => {
        // Clear current selections
        setSelectedNumbers([]);

        // Generate 10 random unique numbers between 1-40
        const randomNumbers = [];
        while (randomNumbers.length < 10) {
            const randomNum = Math.floor(Math.random() * 40) + 1;
            if (!randomNumbers.includes(randomNum)) {
                randomNumbers.push(randomNum);
                // Add a small delay for animation effect (faster)
                setTimeout(() => {
                    setSelectedNumbers(prev => [...prev, randomNum]);
                }, randomNumbers.length * 50); // Faster animation (50ms between selections)
            }
        }
    };

    // Clear all selected numbers
    const handleClearTable = () => {
        setSelectedNumbers([]);
    };

    // Handle risk level change
    const handleRiskChange = (level) => {
        setRiskLevel(level);
    };

    // Handle bet mode change
    const handleBetModeChange = (mode) => {
        setBetMode(mode);
    };

    // Handle bet amount change
    const handleBetAmountChange = (event) => {
        // Limit to 2 decimal places and validate input
        const value = event.target.value;
        if (/^\d*\.?\d{0,2}$/.test(value) || value === '') {
            setBetAmount(value);
        }
    };

    // Handle quick bet amount buttons
    const handleQuickBetAmount = (multiplier) => {
        if (multiplier === '½') {
            setBetAmount((parseFloat(betAmount) / 2).toFixed(2));
        } else if (multiplier === '2x') {
            setBetAmount((parseFloat(betAmount) * 2).toFixed(2));
        }
    };

    // Calculate winnings based on matched numbers and risk level
    const calculateWinnings = (matched) => {
        // Base multipliers by risk level and number of matches
        const multipliers = {
            'Classic': [0, 0, 0, 1.4, 2.25, 4.5, 8.0, 17.0, 50.0, 80.0, 100.0],
            'Low': [0, 0, 0.5, 1, 1.5, 2, 5, 12, 50, 150, 1200],
            'Medium': [0, 0, 0, 0, 2, 4, 8, 15, 50, 200, 1500],
            'High': [0, 0, 0, 0, 0, 2, 10, 40, 100, 500, 2000]
        };

        // Get multiplier based on risk level and number of matches
        const multiplier = multipliers[riskLevel][matched.length];

        // Calculate winnings
        return parseFloat(betAmount) * multiplier;
    };

    // Generate random draw numbers
    const generateDrawNumbers = () => {
        // We need to draw 10 numbers
        const numbers = [];
        while (numbers.length < 10) {
            const randomNum = Math.floor(Math.random() * 40) + 1;
            if (!numbers.includes(randomNum)) {
                numbers.push(randomNum);
            }
        }
        return numbers;
    };

    // Handle the drawing animation - Improved for better visualization with faster speed
    const handleDrawAnimation = (drawnNumbers) => {
        setIsDrawing(true);
        setDrawnResults([]);
        setDrawCount(0);

        // Animate drawing one number at a time with faster pace
        drawnNumbers.forEach((number, index) => {
            setTimeout(() => {
                // Increment draw count
                setDrawCount(index + 1);

                // Add to drawn results
                setDrawnResults(prev => [...prev, number]);

                // Check if this is the last number
                if (index === drawnNumbers.length - 1) {
                    setTimeout(() => {
                        setIsDrawing(false);

                        // Show compact result popup
                        showCompactResultPopup(
                            selectedNumbers.filter(num => drawnNumbers.includes(num)),
                            drawnNumbers
                        );
                    }, 200);
                }
            }, 70 * (index + 1)); // 150ms (0.15 sec) delay between each number - much faster
        });
    };

    // Show compact result popup
    const showCompactResultPopup = (matchedNumbers, drawnNumbers) => {
        const winAmount = calculateWinnings(matchedNumbers);

        // Add winnings to balance
        if (winAmount > 0) {
            setBalance(prevBalance => {
                return parseFloat((prevBalance + winAmount).toFixed(2));
            });
        }

        // Set result data for the compact popup
        setResultData({
            winAmount,
            matchedNumbers,
            drawnNumbers
        });

        // Show compact result
        setShowCompactResult(true);
    };

    // Handle bet button click
    const handleBet = () => {
        // Hide previous result popup if visible
        setShowCompactResult(false);

        // Check if user has selected any numbers
        if (selectedNumbers.length === 0) {
            alert('Please select at least one number');
            return;
        }

        // Check if user has enough balance
        if (parseFloat(betAmount) > balance) {
            alert('Insufficient balance');
            return;
        }

        // Deduct bet amount from balance
        setBalance(prevBalance => {
            return parseFloat((prevBalance - parseFloat(betAmount)).toFixed(2));
        });

        // Generate drawn numbers
        const drawnNumbers = generateDrawNumbers();

        // Start drawing animation
        handleDrawAnimation(drawnNumbers);
    };

    // Close compact result
    const handleCompactResultClose = () => {
        setShowCompactResult(false);
    };

    return (
        <div className="keno-app">
            <div className="keno-container">
                <div className="betting-panel">
                    <div className="balance-display">
                        <span>Balance</span>
                        <span className="balance-amount">${balance.toFixed(2)}</span>
                    </div>

                    <div className="bet-amount-section">
                        <div className="bet-amount-label">
                            <span>Bet Amount</span>
                            <span className="info-icon">ⓘ</span>
                            <span className="amount-display">${betAmount}</span>
                        </div>

                        <div className="bet-amount-input">
                            <div className="crypto-input">
                                <span className="crypto-icon">$</span>
                                <input
                                    type="text"
                                    value={betAmount}
                                    onChange={handleBetAmountChange}
                                />
                            </div>
                            <button
                                className="half-button"
                                onClick={() => handleQuickBetAmount('½')}
                            >
                                ½
                            </button>
                            <button
                                className="double-button"
                                onClick={() => handleQuickBetAmount('2x')}
                            >
                                2×
                            </button>
                        </div>
                    </div>

                    <div className="risk-section">
                        <p>Risk</p>
                        <div className="risk-buttons">
                            <button
                                className={`risk-button classic ${riskLevel === 'Classic' ? 'active' : ''}`}
                                onClick={() => handleRiskChange('Classic')}
                            >
                                Classic
                            </button>
                        </div>
                    </div>

                    <div className="selection-info">
                        <span>{selectedNumbers.length}/10 Numbers Selected</span>
                    </div>

                    <div className="table-action-buttons">
                        <button
                            className="auto-pick-button"
                            onClick={handleAutoPick}
                            disabled={isDrawing}
                        >
                            Auto pick
                        </button>
                        <button
                            className="clear-table-button"
                            onClick={handleClearTable}
                            disabled={isDrawing}
                        >
                            Clear table
                        </button>
                    </div>

                    <button
                        className="bet-button"
                        onClick={handleBet}
                        disabled={isDrawing}
                    >
                        {isDrawing ? "Drawing..." : "Bet"}
                    </button>
                </div>

                <div className="keno-board">
                    <div className="numbers-grid">
                        {generateNumbers().map(number => (
                            <button
                                key={number}
                                className={`number-button 
                                    ${selectedNumbers.includes(number) ? 'selected' : ''} 
                                    ${drawnResults.includes(number) ? 'drawn-result' : ''}
                                    ${drawnResults.includes(number) && selectedNumbers.includes(number) ? 'matched' : ''}
                                `}
                                onClick={() => handleNumberSelect(number)}
                                disabled={isDrawing}
                            >
                                {number}
                            </button>
                        ))}
                    </div>

                    <div className="multipliers-section">
                        <div className="multiplier-rows">
                            <div className="multiplier-row">
                                {['0.00x', '0.00x', '0.00x', '1.40x', '2.25x', '4.50x', '8.00x', '17.00x', '50.00x', '80.00x', '100.0x'].map((multiplier, index) => (
                                    <div key={index} className="multiplier-cell">
                                        {multiplier}
                                    </div>
                                ))}
                            </div>

                            <div className="multiplier-row">
                                {['0x', '1x', '2x', '3x', '4x', '5x', '6x', '7x', '8x', '9x', '10x'].map((multiplier, index) => (
                                    <div key={index} className="multiplier-cell green">
                                        {multiplier} <span className="green-dot">●</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Compact Result Display */}
            {showCompactResult && (
                <div className="compact-result">
                    <div className="compact-result-content">
                        <div className="compact-result-info">
                            <span className="matched-count">{resultData.matchedNumbers.length} / 10</span>
                            <span className="result-multiplier">
                                {calculateWinnings([...Array(resultData.matchedNumbers.length).keys()]) / parseFloat(betAmount) || 0}x
                            </span>
                        </div>
                        {resultData.winAmount > 0 ? (
                            <div className="win-amount-display">+${resultData.winAmount.toFixed(2)}</div>
                        ) : (
                            <div className="no-win-display">No Win</div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default App;