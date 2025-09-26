import React, { useState, useEffect } from 'react';
import './SalesPop.css'; // We will create this CSS file next

// --- Data for randomization ---
const firstNames = ["Michael", "Jessica", "Chris", "Emily", "David", "Sarah", "James", "Laura", "Robert", "Jennifer"];
const cities = ["Minneapolis, MN", "Chicago, IL", "New York, NY", "Los Angeles, CA", "Houston, TX", "Phoenix, AZ", "Denver, CO", "Miami, FL"];
const rooms = ["King Bed Suite", "Double Queen Suite", "Executive King Room"];

const getRandomItem = (arr) => arr[Math.floor(Math.random() * arr.length)];
const getRandomNights = () => Math.floor(Math.random() * 5) + 2; // Random nights between 2 and 6

function SalesPop() {
    const [isVisible, setIsVisible] = useState(false);
    const [notification, setNotification] = useState(null);

    useEffect(() => {
        // Check if the pop-up has already been shown in this session
        const hasBeenShown = sessionStorage.getItem('salesPopShown');

        if (!hasBeenShown) {
            // After a 5-second delay, show the pop-up
            const timer = setTimeout(() => {
                // Create the random notification
                setNotification({
                    name: getRandomItem(firstNames),
                    city: getRandomItem(cities),
                    room: getRandomItem(rooms),
                    nights: getRandomNights(),
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
                    {notification.name} from {notification.city} booked the <br />
                    <strong>{notification.room}</strong> for {notification.nights} nights.
                </p>
            </div>
        </div>
    );
}

export default SalesPop;