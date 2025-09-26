import React, { useRef } from 'react';

function RoomCard({ room, rates, onSelect, isSelected, bookingDetails, onGuestsChange, onPetsChange, onBookNow, nights, subtotal, isProcessing, onOpenLightbox, roomsAvailable }) {
    const carouselRef = useRef(null);
    const priceToday = subtotal ? subtotal / 2 : 0;
    const balanceDue = subtotal ? (subtotal / 2) + (subtotal * 0.1) : 0; // Assuming 10% tax for display

    const guestOptions = Array.from({ length: room.maxOccupancy }, (_, i) => i + 1);
    const petOptions = [0, 1, 2];

    const handleScroll = (direction) => {
        if (carouselRef.current) {
            const scrollAmount = carouselRef.current.offsetWidth;
            carouselRef.current.scrollBy({ left: direction * scrollAmount, behavior: 'smooth' });
        }
    };

    return (
        <div className={`room-card ${isSelected ? 'selected' : ''}`} onClick={() => onSelect(room)}>
            <div className="room-card-image-container">

                {/* --- The New Overlay Container --- */}
                <div className="image-overlay-container">
                    <a onClick={(e) => { e.stopPropagation(); onOpenLightbox(room.imageUrls, 0); }} className="view-photos-pill">
                        View Photos
                    </a>
                    {(typeof roomsAvailable === 'number' && roomsAvailable > 0 && roomsAvailable <= 5) && (
                        <div className="availability-pill">{roomsAvailable} room{roomsAvailable > 1 ? 's' : ''} left!</div>
                    )}
                </div>

                <div className="room-card-image-carousel" ref={carouselRef}>
                    {room.imageUrls.map((image, index) => (
                        <img key={index} src={image} alt={`${room.name} ${index + 1}`} className="carousel-image" />
                    ))}
                </div>

                <button className="scroll-btn prev" onClick={(e) => { e.stopPropagation(); handleScroll(-1); }}>&#10094;</button>
                <button className="scroll-btn next" onClick={(e) => { e.stopPropagation(); handleScroll(1); }}>&#10095;</button>
            </div>

            <div className="room-card-details">
                <div className="room-card-header">
                    <h2>{room.name}</h2>
                </div>
                <p className="room-amenities">{room.amenities}</p>

                {nights > 0 ? (
                    <div className="dynamic-price-display">
                        <div className="price-today">Only Pay ${priceToday.toFixed(2)} Today</div>
                        <div className="price-balance">Balance (${balanceDue.toFixed(2)}) When You Arrive</div>
                    </div>
                ) : (
                    <div className="room-price">${rates?.NIGHTLY || 59} <span>/ night</span></div>
                )}

                {isSelected && (
                    <div className="card-actions">
                        <div className="actions-left">
                            <div className="action-item">
                                <label htmlFor={`guests-${room.id}`} className="action-item-label">Guests</label>
                                <select id={`guests-${room.id}`} value={bookingDetails.guests} onChange={(e) => onGuestsChange(parseInt(e.target.value))}>
                                    {guestOptions.map(number => <option key={number} value={number}>{number}</option>)}
                                </select>
                            </div>
                            <div className="action-item">
                                <label htmlFor={`pets-${room.id}`} className="action-item-label">Pets</label>
                                <select id={`pets-${room.id}`} value={bookingDetails.pets} onChange={(e) => onPetsChange(parseInt(e.target.value))}>
                                    {petOptions.map(number => <option key={number} value={number}>{number}</option>)}
                                </select>
                            </div>
                        </div>
                        <button className="btn book-now-btn" onClick={onBookNow} disabled={isProcessing}>{isProcessing ? 'Processing...' : 'Book Now'}</button>
                    </div>
                )}
            </div>
        </div>
    );
}

export default RoomCard;