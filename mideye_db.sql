-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: localhost
-- Generation Time: Jun 16, 2026 at 06:41 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `mideye_db`
--

-- --------------------------------------------------------

--
-- Table structure for table `bookings`
--

CREATE TABLE `bookings` (
  `id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `trip_type` enum('oneway','roundtrip') NOT NULL DEFAULT 'oneway',
  `passenger_name` varchar(150) NOT NULL,
  `phone` varchar(20) NOT NULL,
  `email` varchar(150) NOT NULL,
  `origin` varchar(10) NOT NULL,
  `destination` varchar(10) NOT NULL,
  `travel_date` date NOT NULL,
  `return_date` date DEFAULT NULL,
  `adults` tinyint(4) NOT NULL DEFAULT 1,
  `children` tinyint(4) NOT NULL DEFAULT 0,
  `infants` tinyint(4) NOT NULL DEFAULT 0,
  `cabin_class` enum('economy','business') NOT NULL DEFAULT 'economy',
  `seat_preference` varchar(50) DEFAULT NULL,
  `special_requests` text DEFAULT NULL,
  `status` enum('Pending','Confirmed','Completed','Cancelled','Delay') NOT NULL DEFAULT 'Pending',
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `bookings`
--

INSERT INTO `bookings` (`id`, `user_id`, `trip_type`, `passenger_name`, `phone`, `email`, `origin`, `destination`, `travel_date`, `return_date`, `adults`, `children`, `infants`, `cabin_class`, `seat_preference`, `special_requests`, `status`, `created_at`, `updated_at`) VALUES
(1, NULL, 'oneway', 'AYUUB CABDIRISAAQ', '+252906938958', 'anzaricj@gmail.com', 'GLK', 'MGQ', '2026-05-28', NULL, 1, 0, 0, 'economy', NULL, 'first booking', 'Confirmed', '2026-05-25 19:44:40', '2026-06-05 07:48:49'),
(2, NULL, 'oneway', 'AYUUB CABDIRISAAQ', '252 90 6938958', 'ayuubcj@gmail.com', 'GLK', 'MGQ', '2026-06-11', NULL, 2, 0, 0, 'economy', NULL, NULL, 'Confirmed', '2026-06-05 07:34:46', '2026-06-05 07:48:43'),
(3, NULL, 'roundtrip', 'Ibra Abdirzak', '252 90 7772534', 'ibra@gmail.com', 'MGQ', 'HGA', '2026-06-14', '2026-06-26', 4, 0, 0, 'business', NULL, 'just for work', 'Confirmed', '2026-06-05 07:53:00', '2026-06-05 08:05:33'),
(4, NULL, 'oneway', 'ibra abdirzak', '252 90 7772534', 'ibra@gmail.com', 'GLK', 'MGQ', '2026-06-18', NULL, 1, 0, 0, 'economy', NULL, 'be active guys', 'Completed', '2026-06-05 08:03:41', '2026-06-05 08:05:27'),
(5, NULL, 'oneway', 'ibra abdirzak', '+252 90 7257942', 'ibra@gmail.com', 'MGQ', 'GLK', '2026-06-07', NULL, 1, 0, 0, 'economy', NULL, NULL, 'Completed', '2026-06-05 08:07:56', '2026-06-06 07:18:55'),
(6, NULL, 'roundtrip', 'ibra abdirzak', '252906938958', 'ibra@gmail.com', 'MGQ', 'GLK', '2026-06-11', '2026-06-14', 1, 0, 0, 'business', NULL, NULL, 'Confirmed', '2026-06-07 07:42:28', '2026-06-07 07:48:50'),
(7, NULL, 'oneway', 'ibra abdirzak', '252 90 6938958', 'ibra@gmail.com', 'KSM', 'GLK', '2026-06-16', '2026-06-26', 1, 0, 0, 'economy', NULL, NULL, 'Pending', '2026-06-07 07:50:15', '2026-06-07 07:50:15'),
(8, NULL, 'oneway', 'ibra abdirzak', '252 90 7257942', 'ibra@gmail.com', 'GLK', 'MGQ', '2026-06-11', NULL, 1, 0, 0, 'economy', NULL, NULL, 'Completed', '2026-06-07 08:09:38', '2026-06-07 08:15:32'),
(9, 5, 'oneway', 'AYUUB CABDIRISAAQ', '2526747477', 'ayuub@gmail.com', 'GLK', 'MGQ', '2026-06-12', NULL, 1, 0, 0, 'economy', NULL, NULL, 'Pending', '2026-06-12 20:31:00', '2026-06-12 20:31:00'),
(10, NULL, 'oneway', 'AYUUB CABDIRISAAQ', '46436346', 'sdgdgdr@gmail.com', 'GLK', 'MGQ', '2026-06-12', NULL, 1, 0, 0, 'economy', NULL, NULL, 'Pending', '2026-06-12 20:42:30', '2026-06-12 20:42:30'),
(11, 10, 'oneway', 'AYUUB CABDIRISAAQ', '12345678', 'ayuub@gmail.com', 'MGQ', 'HGA', '2026-06-09', NULL, 1, 0, 0, 'economy', NULL, NULL, 'Pending', '2026-06-15 06:17:15', '2026-06-15 06:17:15'),
(12, 11, 'roundtrip', 'zaki abdi', '252906938958', 'zaki@gmail.com', 'MGQ', 'HGA', '2026-06-27', '2026-06-30', 1, 0, 0, 'business', NULL, NULL, 'Confirmed', '2026-06-16 14:48:33', '2026-06-16 14:52:34'),
(13, 12, 'oneway', 'dahir ali', '29929299', 'dahir@gmail.com', 'MGQ', 'HGA', '2026-06-09', NULL, 1, 0, 0, 'economy', NULL, NULL, 'Confirmed', '2026-06-16 16:22:06', '2026-06-16 16:22:55'),
(14, 13, 'oneway', 'axmed xasan', '252906938958', 'ahmed@gmail.com', 'MGQ', 'HGA', '2026-06-09', NULL, 1, 0, 0, 'economy', NULL, NULL, 'Pending', '2026-06-16 16:33:45', '2026-06-16 16:33:45');

-- --------------------------------------------------------

--
-- Table structure for table `cargo`
--

CREATE TABLE `cargo` (
  `id` int(11) NOT NULL,
  `tracking_id` varchar(20) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `sender_name` varchar(150) NOT NULL,
  `sender_phone` varchar(20) NOT NULL,
  `sender_email` varchar(150) DEFAULT NULL,
  `sender_address` varchar(255) DEFAULT NULL,
  `recipient_name` varchar(150) NOT NULL,
  `recipient_phone` varchar(20) NOT NULL,
  `origin` varchar(50) NOT NULL DEFAULT 'Galkacyo (GLK)',
  `destination` varchar(10) NOT NULL,
  `cargo_type` varchar(50) NOT NULL,
  `pieces` int(11) NOT NULL DEFAULT 1,
  `weight` decimal(8,2) NOT NULL,
  `length_cm` decimal(8,2) DEFAULT NULL,
  `width_cm` decimal(8,2) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `shipping_speed` enum('standard','express') NOT NULL DEFAULT 'standard',
  `insurance` tinyint(1) NOT NULL DEFAULT 0,
  `fragile` tinyint(1) NOT NULL DEFAULT 0,
  `signature_required` tinyint(1) NOT NULL DEFAULT 0,
  `special_requests` text DEFAULT NULL,
  `status` enum('Received','In Transit','Arrived','Cancelled') NOT NULL DEFAULT 'Received',
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `cargo`
--

INSERT INTO `cargo` (`id`, `tracking_id`, `user_id`, `sender_name`, `sender_phone`, `sender_email`, `sender_address`, `recipient_name`, `recipient_phone`, `origin`, `destination`, `cargo_type`, `pieces`, `weight`, `length_cm`, `width_cm`, `description`, `shipping_speed`, `insurance`, `fragile`, `signature_required`, `special_requests`, `status`, `created_at`, `updated_at`) VALUES
(1, 'MDY-0001', NULL, 'AYUUB CABDIRISAAQ', '+252906938958', 'anzaricj@gmail.com', 'Fooneeyaha 1aad', 'isxaq abdirsaq', '+252906890131', 'Galkacyo (GLK)', 'MGQ', 'electronics', 5, 10.00, 9.00, 3.00, 'some thing mising there', 'express', 1, 0, 0, '...', 'In Transit', '2026-05-25 19:47:49', '2026-06-07 07:39:57'),
(2, 'MDY-0002', NULL, 'AYUUB CABDIRISAAQ', '252 90 6938958', 'Ayuubcj@gmail.com', 'Fooneeyaha 1aad', 'ALI maxamed', '25290 7650107', 'Galkacyo (GLK)', 'MGQ', 'textiles', 4, 10.00, NULL, NULL, 'labo booeso oo dhar ah midiiba 5kg ah', 'standard', 1, 1, 1, NULL, 'In Transit', '2026-06-05 07:40:00', '2026-06-05 07:49:15'),
(3, 'MDY-0003', NULL, 'Ibra abdirzak', '252 90 7772534', 'ibra@gmail.com', 'Banadir,mogadisho', 'axmaed cumar', '252 7778899', 'Galkacyo (GLK)', 'HGA', 'electronics', 20, 40.00, 0.00, NULL, 'be save my cargo guys', 'express', 1, 1, 1, NULL, 'In Transit', '2026-06-05 07:55:40', '2026-06-07 07:39:52'),
(4, 'MDY-0004', NULL, 'ibra abdirzak', '252 90 7257942', 'ibra@gmail.com', NULL, 'axmed ali', '252 90 6923867', 'Galkacyo (GLK)', 'MGQ', 'electronics', 4, 3.00, NULL, NULL, NULL, 'express', 0, 0, 0, NULL, 'Received', '2026-06-07 07:47:12', '2026-06-07 07:48:42'),
(5, 'MDY-0005', 5, 'AYUUB CABDIRISAAQ', '346346436', NULL, 'Fooneeyaha 1aad', 'ghtrxhr', '456346346', 'Galkacyo (GLK)', 'HGA', 'documents', 4, 5.00, NULL, NULL, NULL, 'standard', 0, 0, 0, NULL, 'Received', '2026-06-12 20:32:07', '2026-06-12 20:32:07'),
(6, 'MDY-0006', 10, 'AYUUB CABDIRISAAQ', '252907878898', NULL, 'Fooneeyaha 1aad', 'abdilah abdiftah', '25290777777', 'Galkacyo (GLK)', 'MGQ', 'textiles', 7, 7.00, NULL, NULL, 'hh', 'standard', 0, 0, 0, NULL, 'Received', '2026-06-15 06:22:44', '2026-06-15 06:22:44'),
(7, 'MDY-0007', 11, 'zaki abdi', '2521346788', NULL, 'Fooneeyaha 1aad', 'ayuub abdi', '252609088', 'Galkacyo (GLK)', 'KSM', 'electronics', 2, 1.00, NULL, NULL, '11', 'standard', 0, 0, 0, NULL, 'Arrived', '2026-06-16 14:51:08', '2026-06-16 14:52:42');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `full_name` varchar(100) NOT NULL,
  `email` varchar(150) NOT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `city` varchar(100) DEFAULT NULL,
  `password` varchar(255) NOT NULL,
  `role` enum('user','admin') NOT NULL DEFAULT 'user',
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `status` enum('Active','Inactive') NOT NULL DEFAULT 'Active',
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `full_name`, `email`, `phone`, `city`, `password`, `role`, `is_active`, `status`, `created_at`, `updated_at`) VALUES
(1, 'Mideye Admin', 'admin@mideye.so', '+252 615 000000', NULL, '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TsCob7JK7FHrB3UTbj2QL8szDcCi', 'admin', 1, 'Active', '2026-05-25 15:29:42', '2026-05-25 15:29:42'),
(3, 'Mideye Admin', 'admin@mideye.com', '+252 615 000000', NULL, '$2a$12$Pi4TgybSr725QK5MqDDC3.lPWp2Z5Qh5Bqxv1C/EMde.UTRUGQJAa', 'admin', 1, 'Active', '2026-06-04 07:55:49', '2026-06-04 07:55:49'),
(5, 'ayuub adirzak', 'Ayuubcj@gmail.com', NULL, NULL, '$2a$12$2LZ7rq86N.xRBrWMSRezCOEN9UlNSnT0riZKxO8goSz1jlZWNrrWi', 'user', 1, 'Active', '2026-06-04 15:14:08', '2026-06-04 15:14:08'),
(6, 'ibra abdirzak', 'ibra@gmail.com', NULL, NULL, '$2a$12$sUuCL5Fv8TQW4xJD6rpajOg8RQPktPhHGQDnBencZ7k.8gQbE8ZgK', 'user', 1, 'Active', '2026-06-05 07:50:31', '2026-06-05 07:50:31'),
(7, 'ani', 'dfjejfe@gmail.com', NULL, NULL, '$2a$12$1GKrI6lYjFHUONixDrkEaeeKYUi/2kV0KgbD3f/uVDxpJrgeYXDdG', 'user', 1, 'Active', '2026-06-12 20:53:11', '2026-06-12 20:53:11'),
(8, 'ahmed hasan', 'ahmed@gmail.com', NULL, NULL, '$2a$12$vPVy0riYPAbLI.fFmao24eX4YfaW1yFESFZPpRHGPs8mJC45Iqnd.', 'user', 1, 'Active', '2026-06-14 19:53:36', '2026-06-14 19:53:36'),
(9, 'umu ayuub', 'ummu@gmail.com', NULL, NULL, '$2a$12$hv4cgIL4mDUGwUGQOhLTxuueev8FD7nkqoINI1XzV.SHDiMpy7V1.', 'user', 1, 'Active', '2026-06-14 20:31:18', '2026-06-14 20:31:18'),
(10, 'gfhdfhdf', 'gdgdfhdf@gmail.com', NULL, NULL, '$2a$12$tmlPdJQ0Yg4kZ0NnBuUA3uJOAOHHj1lafFcwW8LWvrTa/6SoNhhsW', 'user', 1, 'Active', '2026-06-15 06:14:47', '2026-06-15 06:14:47'),
(11, 'zaki abdi', 'zaki@gmail.com', '252905029324', NULL, '$2a$12$Szi7UY/lSL.EkH3nJN48TOjaoDI.O4vSNRFa3ZCbDpra4pV4rtBe2', 'user', 1, 'Active', '2026-06-16 14:40:33', '2026-06-16 14:54:18'),
(12, 'dahir ali axmed', 'dahir@gmail.com', NULL, NULL, '$2a$12$lBWV8LOMgQ1WZ5FGcdmKEO98Dco3pJw298SisUq1cBI0VavMk/hZG', 'user', 1, 'Active', '2026-06-16 16:20:37', '2026-06-16 19:24:34'),
(13, 'axmed xasan cali', 'axmed@gmail.com', NULL, NULL, '$2a$12$OwTVPR5OLLGSDs8m8i6S4O2.ekfa3LcbLHnlxWLrsC/C2NBB2pX06', 'user', 1, 'Active', '2026-06-16 16:28:11', '2026-06-16 19:36:34');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `bookings`
--
ALTER TABLE `bookings`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `cargo`
--
ALTER TABLE `cargo`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `tracking_id` (`tracking_id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `bookings`
--
ALTER TABLE `bookings`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=15;

--
-- AUTO_INCREMENT for table `cargo`
--
ALTER TABLE `cargo`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=14;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `bookings`
--
ALTER TABLE `bookings`
  ADD CONSTRAINT `bookings_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `cargo`
--
ALTER TABLE `cargo`
  ADD CONSTRAINT `cargo_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
