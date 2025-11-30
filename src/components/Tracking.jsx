import React, { useEffect, useState } from "react";
import "./layout.css";

const TrackingBody = () => {
  const [orders, setOrders] = useState([]);

  // Fetch orders from backend
  useEffect(() => {
    fetch("/api/orders") // Change to your real API URL
      .then((res) => res.json())
      .then((data) => setOrders(data))
  }, []);

  return (
    <div className="tracking-body">
      {/* Header Row */}
      <div className="tracking-header">
        <h2>Tracking <span>{orders.length} deliveries</span></h2>
        <div className="filters">
          <button className="active">All</button>
          <button>On route</button>
          <button>Waiting</button>
          <button>Inactive</button>
        </div>
      </div>

      {/* Search & Filter Row */}
      <div className="search-filter">
        <input type="text" placeholder="Search for track ID, customer, status..." />
        <select>
          <option>Filters</option>
        </select>
        <select>
          <option>Time</option>
        </select>
      </div>

      {/* Orders Grid */}
      <div className="orders-grid">
        {orders.map((order) => (
          <div className="order-card" key={order.id}>
            <div className="order-top">
              <span className={`status ${order.status.toLowerCase()}`}>{order.status}</span>
              <span className="eta">{order.eta}</span>
            </div>
            <h4>{order.trackingId}</h4>
            <p className="route">{order.from} → {order.to}</p>
            <p>Distance: {order.distance} km</p>
            <p>Estimated time: {order.estimatedTime}</p>
            <div className="addresses">
              <div>{order.fromAddress}</div>
              <div>{order.toAddress}</div>
            </div>
            <div className="truck-img">
              <img src="/truck.png" alt="Truck" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TrackingBody;
