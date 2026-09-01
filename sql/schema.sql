CREATE DATABASE IF NOT EXISTS cihoshe_lounge CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE cihoshe_lounge;

CREATE TABLE IF NOT EXISTS customers (
  CustomerID INT AUTO_INCREMENT PRIMARY KEY,
  Name VARCHAR(100) NOT NULL,
  Email VARCHAR(100) NOT NULL UNIQUE,
  Phone VARCHAR(20) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS reservations (
  ReservationID INT AUTO_INCREMENT PRIMARY KEY,
  CustomerID INT NOT NULL,
  Date DATE NOT NULL,
  Time TIME NOT NULL,
  PartySize INT NOT NULL,
  status ENUM('Pending','Confirmed','Rejected','Cancelled') DEFAULT 'Pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_res_customer FOREIGN KEY (CustomerID) REFERENCES customers(CustomerID) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS menu_items (
  ItemID INT AUTO_INCREMENT PRIMARY KEY,
  Name VARCHAR(100) NOT NULL,
  Description TEXT,
  Price DECIMAL(10,2) NOT NULL,
  Category VARCHAR(50) NOT NULL,
  ImageURL VARCHAR(500),
  is_available BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS orders (
  OrderID INT AUTO_INCREMENT PRIMARY KEY,
  ReservationID INT NULL,
  TotalAmount DECIMAL(10,2) NOT NULL DEFAULT 0,
  status ENUM('New','Preparing','Ready','Completed','Cancelled') DEFAULT 'New',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_order_reservation FOREIGN KEY (ReservationID) REFERENCES reservations(ReservationID) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS feedback (
  FeedbackID INT AUTO_INCREMENT PRIMARY KEY,
  CustomerID INT NOT NULL,
  Rating TINYINT NOT NULL,
  Comments TEXT NOT NULL,
  submission_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_rating CHECK (Rating BETWEEN 1 AND 5),
  CONSTRAINT fk_feedback_customer FOREIGN KEY (CustomerID) REFERENCES customers(CustomerID) ON DELETE CASCADE
);

DELETE FROM menu_items WHERE Name = 'Umqombothi Beer Bread';

INSERT INTO menu_items (Name, Description, Price, Category, ImageURL) VALUES
('Umngqusho Supreme', 'Creamed white maize and butter beans infused with truffle oil, crispy sage and aged balsamic.', 320.00, 'Signature', '/images/umngqusho.jpg'),
('Pan-Seared Kingklip with Umfino', 'Wild-caught kingklip with sautéed indigenous spinach, coconut cream and amaranth crust.', 380.00, 'Seafood', 'https://images.unsplash.com/photo-1580959375944-abd7e991f971?auto=format&fit=crop&w=1000&q=80'),
('Sosatie Skewers', 'Marinated lamb cubes with apricot glaze, roasted onion and traditional spice dust.', 340.00, 'Signature', '/images/sosaties.jpg'),
('Sorghum-Crusted Duck Breast', 'Pan-roasted duck breast with sorghum flour crust, spiced beetroot purée and microgreens.', 395.00, 'Signature', '/images/duck-breast.jpg'),
('Mogodu Elegante', 'Slow-cooked tripe with tomato compote, ginger, traditional Xhosa spices and polenta base.', 280.00, 'Heritage', '/images/mogodu.jpg'),
('Braised Lamb Neck with Heritage Herbs', 'Tender 12-hour braised lamb neck, root vegetable medley, thyme and African mint sauce.', 360.00, 'Signature', '/images/lamb-neck.jpg'),
('Refined Bunny Chow', 'Artisanal sourdough hollowed and filled with spiced vegetable curry, pickled onion and cilantro.', 240.00, 'Heritage', '/images/bunny-chow.jpg'),
('Sorghum Flour Pudding', 'Baked sorghum flour pudding with caramelized banana, spiced honey and vanilla cream.', 110.00, 'Dessert', '/images/sorghum-pudding.jpg'),
('Malva Pudding', 'Traditional warm malva pudding with vanilla custard, toasted nuts and salted caramel.', 95.00, 'Dessert', 'https://images.unsplash.com/photo-1551024506-0bccd828d307?auto=format&fit=crop&w=1000&q=80'),
('Rooibos & Honey Tart', 'Crispy pastry tart with rooibos-infused custard, honeycomb and edible flowers.', 120.00, 'Dessert', 'https://images.unsplash.com/photo-1571115177098-24ec42ed204d?auto=format&fit=crop&w=1000&q=80'),
('Ginger Beer', 'Sparkling house ginger beer with fresh ginger, lemon and a gentle touch of honey.', 65.00, 'Beverage', 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=1000&q=80'),
('Rooibos Citrus Infusion', 'Chilled rooibos with fresh citrus, mint, ginger and seasonal berries.', 65.00, 'Beverage', '/images/rooibos-citrus-cooler.jpg')
ON DUPLICATE KEY UPDATE Name=VALUES(Name), Description=VALUES(Description), Price=VALUES(Price), Category=VALUES(Category), ImageURL=VALUES(ImageURL);
