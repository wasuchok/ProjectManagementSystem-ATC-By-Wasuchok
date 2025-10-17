-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Oct 17, 2025 at 11:42 AM
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
-- Database: `pms`
--

-- --------------------------------------------------------

--
-- Table structure for table `tb_project_members`
--

CREATE TABLE `tb_project_members` (
  `id` int(11) NOT NULL,
  `project_id` int(11) DEFAULT NULL,
  `user_id` varchar(255) DEFAULT NULL,
  `status` enum('invited','joined','declined') DEFAULT 'invited',
  `invited_by` varchar(255) NOT NULL,
  `is_active` tinyint(1) DEFAULT NULL,
  `joined_at` datetime DEFAULT NULL,
  `left_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

--
-- Dumping data for table `tb_project_members`
--

INSERT INTO `tb_project_members` (`id`, `project_id`, `user_id`, `status`, `invited_by`, `is_active`, `joined_at`, `left_at`) VALUES
(2, 3, 'f5928e80-a97d-11f0-b354-00be43e7be05', 'invited', 'f5928e80-a97d-11f0-b354-00be43e7be05', NULL, NULL, NULL),
(3, 3, 'f2abe56e-aa89-11f0-a734-00be43e7be05', 'invited', 'f5928e80-a97d-11f0-b354-00be43e7be05', NULL, NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `tb_project_projects`
--

CREATE TABLE `tb_project_projects` (
  `id` int(11) NOT NULL,
  `join_code` varchar(20) DEFAULT NULL,
  `name` varchar(255) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `priority` enum('low','normal','high','urgent') NOT NULL,
  `status` enum('draft','started','completed','cancelled') NOT NULL,
  `join_enabled` tinyint(1) NOT NULL,
  `progress_percent` decimal(5,2) DEFAULT 0.00,
  `completed_date` datetime DEFAULT NULL,
  `created_by` varchar(255) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

--
-- Dumping data for table `tb_project_projects`
--

INSERT INTO `tb_project_projects` (`id`, `join_code`, `name`, `description`, `priority`, `status`, `join_enabled`, `progress_percent`, `completed_date`, `created_by`, `created_at`, `updated_at`) VALUES
(3, NULL, 'ทดสอบสร้างโปรเจกต์', 'ทดสอบสร้างโปรเจกต์ แบบใหม่แบบสับ', 'urgent', 'draft', 1, 0.00, NULL, NULL, '2025-10-17 09:41:00', '2025-10-17 09:41:00');

-- --------------------------------------------------------

--
-- Table structure for table `user_account`
--

CREATE TABLE `user_account` (
  `user_id` char(36) NOT NULL DEFAULT uuid(),
  `username` varchar(50) DEFAULT NULL,
  `password_hash` varchar(255) DEFAULT NULL,
  `full_name` varchar(255) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `department` varchar(50) NOT NULL,
  `position` varchar(50) NOT NULL,
  `image` varchar(255) DEFAULT NULL,
  `v_admin` int(11) DEFAULT 0,
  `v_create` int(11) DEFAULT 0,
  `status` int(11) DEFAULT 0,
  `create_date` datetime DEFAULT current_timestamp(),
  `create_by` char(36) DEFAULT NULL,
  `refresh_token` varchar(255) DEFAULT NULL,
  `sect` varchar(10) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

--
-- Dumping data for table `user_account`
--

INSERT INTO `user_account` (`user_id`, `username`, `password_hash`, `full_name`, `email`, `department`, `position`, `image`, `v_admin`, `v_create`, `status`, `create_date`, `create_by`, `refresh_token`, `sect`) VALUES
('f2abe56e-aa89-11f0-a734-00be43e7be05', 'admin', '$argon2id$v=19$m=65536,t=3,p=4$mebiiiZOIQEjLgrmNbBgbA$CVMPCjQy6xOmSFfuX/UN/WMpaBnBZqy1gusj19WYm4Y', 'admin admin', 'admin@gmail.com', 'IT', 'IT', NULL, 1, 1, 0, '2025-10-16 12:16:30', 'f5928e80-a97d-11f0-b354-00be43e7be05', NULL, 'ATC'),
('f5928e80-a97d-11f0-b354-00be43e7be05', '680042', '$argon2id$v=19$m=65536,t=3,p=4$WH3URMmH4kknR9X4a6+S+g$/q0UqS4pSB9IawJqnUio6pebcL/QD0K5hS+cKCQ9ZrI', 'วสุโชค ใจน้ำ', 'wasuchokop@gmail.com', 'IT', 'STAFF', 'uploads\\images\\users\\1760501889720.jpg', 1, 1, 0, '2025-10-15 04:18:10', NULL, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJmNTkyOGU4MC1hOTdkLTExZjAtYjM1NC0wMGJlNDNlN2JlMDUiLCJlbWFpbCI6Indhc3VjaG9rb3BAZ21haWwuY29tIiwicm9sZXMiOlsiYWRtaW4iLCJzdGFmZiJdLCJpYXQiOjE3NjA2NzUwNDgsImV4cCI6MTc2MTI3OTg0OH0.FdmAz_N39ibNMgoQvRHstWCW9J96VdPY0h', 'ATC');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `tb_project_members`
--
ALTER TABLE `tb_project_members`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_project_id` (`project_id`),
  ADD KEY `fk_user_id` (`user_id`);

--
-- Indexes for table `tb_project_projects`
--
ALTER TABLE `tb_project_projects`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_created_by` (`created_by`);

--
-- Indexes for table `user_account`
--
ALTER TABLE `user_account`
  ADD PRIMARY KEY (`user_id`),
  ADD KEY `fk_create_by` (`create_by`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `tb_project_members`
--
ALTER TABLE `tb_project_members`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `tb_project_projects`
--
ALTER TABLE `tb_project_projects`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `tb_project_members`
--
ALTER TABLE `tb_project_members`
  ADD CONSTRAINT `fk_project_id` FOREIGN KEY (`project_id`) REFERENCES `tb_project_projects` (`id`) ON DELETE SET NULL ON UPDATE SET NULL,
  ADD CONSTRAINT `fk_user_id` FOREIGN KEY (`user_id`) REFERENCES `user_account` (`user_id`) ON DELETE SET NULL ON UPDATE SET NULL;

--
-- Constraints for table `tb_project_projects`
--
ALTER TABLE `tb_project_projects`
  ADD CONSTRAINT `fk_created_by` FOREIGN KEY (`created_by`) REFERENCES `user_account` (`user_id`) ON DELETE SET NULL ON UPDATE SET NULL;

--
-- Constraints for table `user_account`
--
ALTER TABLE `user_account`
  ADD CONSTRAINT `fk_create_by` FOREIGN KEY (`create_by`) REFERENCES `user_account` (`user_id`) ON DELETE NO ACTION ON UPDATE NO ACTION;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
