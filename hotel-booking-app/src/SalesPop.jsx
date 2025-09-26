import React, { useState, useEffect } from 'react';
import './SalesPop.css'; // The existing CSS will work perfectly

// --- Updated data for randomization ---
const peopleCount = ["1 person", "2 people", "3 people"];
const durations = ["4 nights", "1 week", "2 weeks", "1 month"];

const getRandomItem = (arr) => arr[Math.floor(Math.random() * arr.length)];

function SalesPop() {
    const [isVisible, setIsVisible] = useState(false);
    const [notification, setNotification] = useState(null);

    useEffect(() => {
        // Check if the pop-up has already been shown in this session
        const hasBeenShown = sessionStorage.getItem('salesPopShown');

        if (!hasBeenShown) {
            // After a 5-second delay, show the pop-up
            const timer = setTimeout(() => {
                // Create the new random notification
                setNotification({
                    people: getRandomItem(peopleCount),
                    duration: getRandomItem(durations),
                });
                setIsVisible(true);
                
                // Mark as shown for this session
                sessionStorage.setItem('salesPopShown', 'true');
            }, 5000); // 5-second delay

            // After another 10 seconds, hide the pop-up
            const hideTimer = setTimeout(() => {
                setIsVisible(false);
            }, 15000); // 5s delay + 10s visible = 15s total

            // Cleanup timers if the component unmounts
            return () => {
                clearTimeout(timer);
                clearTimeout(hideTimer);
            };
        }
    }, []); // Empty array ensures this effect runs only once

    if (!isVisible || !notification) {
        return null;
    }

    return (
        <div className="sales-pop-container">
            <div className="sales-pop-content">
                <p><strong>Someone just booked!</strong></p>
                <p>
                    {/* Updated text to be more general */}
                    <strong>{notification.people}</strong> just booked for <strong>{notification.duration}</strong>.
                </p>
            </div>
        </div>
    );
}

export default SalesPop;