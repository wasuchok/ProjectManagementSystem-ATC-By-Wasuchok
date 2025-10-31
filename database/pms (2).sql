-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Oct 31, 2025 at 10:56 AM
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
(1, 1, 'f2abe56e-aa89-11f0-a734-00be43e7be05', 'joined', 'f2abe56e-aa89-11f0-a734-00be43e7be05', NULL, NULL, NULL),
(2, 1, 'f5928e80-a97d-11f0-b354-00be43e7be05', 'joined', 'f2abe56e-aa89-11f0-a734-00be43e7be05', NULL, NULL, NULL);

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
(1, 'NCOXWS', 'การเรียนรู้ รอบที่ 1', 'ทดสอบการเรียนรู้ครั้งที่ 1', 'high', 'draft', 1, 0.00, NULL, 'f2abe56e-aa89-11f0-a734-00be43e7be05', '2025-10-25 03:41:04', '2025-10-25 03:41:04');

-- --------------------------------------------------------

--
-- Table structure for table `tb_project_sub_tasks`
--

CREATE TABLE `tb_project_sub_tasks` (
  `id` int(11) NOT NULL,
  `task_id` int(10) NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text NOT NULL,
  `status_id` int(10) NOT NULL,
  `progress_percent` decimal(5,2) NOT NULL,
  `start_date` datetime NOT NULL,
  `has_due_date` tinyint(1) DEFAULT NULL,
  `due_date` datetime DEFAULT NULL,
  `completed_date` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

--
-- Dumping data for table `tb_project_sub_tasks`
--

INSERT INTO `tb_project_sub_tasks` (`id`, `task_id`, `title`, `description`, `status_id`, `progress_percent`, `start_date`, `has_due_date`, `due_date`, `completed_date`, `created_at`, `updated_at`) VALUES
(6, 2, 'สร้าง Function Calculate', 'ทดสอบการสร้าง', 2, 100.00, '2025-10-31 00:00:00', 0, NULL, NULL, '2025-10-31 02:41:36', '2025-10-31 06:30:34'),
(7, 2, 'ฟหก', '', 4, 0.00, '2025-10-31 00:00:00', 0, NULL, NULL, '2025-10-31 02:51:53', '2025-10-31 02:51:53'),
(8, 2, 'tee', 'tee', 4, 100.00, '2025-10-31 00:00:00', 1, '2025-10-23 00:00:00', '2025-10-31 09:46:00', '2025-10-31 03:54:54', '2025-10-31 16:53:21'),
(9, 3, 'gg', 'gg', 3, 100.00, '2025-10-31 00:00:00', 0, NULL, NULL, '2025-10-31 04:54:25', '2025-10-31 06:14:17'),
(10, 3, 'sdf', 'sdf', 3, 100.00, '2025-10-31 00:00:00', 1, '2025-11-06 00:00:00', '2025-10-31 09:46:00', '2025-10-31 04:56:05', '2025-10-31 16:53:26'),
(11, 3, 'ทดสอบไม่รู้จบ', '', 3, 100.00, '2025-10-31 00:00:00', 0, NULL, '2025-10-31 09:46:00', '2025-10-31 06:03:23', '2025-10-31 09:46:00'),
(12, 4, 'homework', 'homework', 5, 100.00, '2025-10-31 00:00:00', 1, '2025-11-08 00:00:00', '2025-10-31 09:46:00', '2025-10-31 07:08:50', '2025-10-31 16:53:29'),
(13, 3, 'ttt', 'ttt', 3, 100.00, '2025-10-31 00:00:00', 1, '2025-11-08 00:00:00', '2025-10-31 09:49:51', '2025-10-31 09:49:38', '2025-10-31 09:49:51');

-- --------------------------------------------------------

--
-- Table structure for table `tb_project_sub_task_assignees`
--

CREATE TABLE `tb_project_sub_task_assignees` (
  `id` int(11) NOT NULL,
  `subtask_id` int(10) NOT NULL,
  `user_id` varchar(255) NOT NULL,
  `assigned_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

--
-- Dumping data for table `tb_project_sub_task_assignees`
--

INSERT INTO `tb_project_sub_task_assignees` (`id`, `subtask_id`, `user_id`, `assigned_at`) VALUES
(7, 6, 'f2abe56e-aa89-11f0-a734-00be43e7be05', '2025-10-31 02:41:36'),
(8, 6, 'f5928e80-a97d-11f0-b354-00be43e7be05', '2025-10-31 02:41:36'),
(9, 7, 'f5928e80-a97d-11f0-b354-00be43e7be05', '2025-10-31 02:51:53'),
(10, 8, 'f2abe56e-aa89-11f0-a734-00be43e7be05', '2025-10-31 03:54:54'),
(11, 9, 'f2abe56e-aa89-11f0-a734-00be43e7be05', '2025-10-31 04:54:25'),
(12, 9, 'f5928e80-a97d-11f0-b354-00be43e7be05', '2025-10-31 04:54:25'),
(13, 10, 'f5928e80-a97d-11f0-b354-00be43e7be05', '2025-10-31 04:56:05'),
(14, 10, 'f2abe56e-aa89-11f0-a734-00be43e7be05', '2025-10-31 04:56:05'),
(15, 11, 'f2abe56e-aa89-11f0-a734-00be43e7be05', '2025-10-31 06:03:23'),
(16, 11, 'f5928e80-a97d-11f0-b354-00be43e7be05', '2025-10-31 06:03:23'),
(17, 12, 'f2abe56e-aa89-11f0-a734-00be43e7be05', '2025-10-31 07:08:50'),
(18, 12, 'f5928e80-a97d-11f0-b354-00be43e7be05', '2025-10-31 07:08:50'),
(19, 13, 'f2abe56e-aa89-11f0-a734-00be43e7be05', '2025-10-31 09:49:38'),
(20, 13, 'f5928e80-a97d-11f0-b354-00be43e7be05', '2025-10-31 09:49:38');

-- --------------------------------------------------------

--
-- Table structure for table `tb_project_tasks`
--

CREATE TABLE `tb_project_tasks` (
  `id` int(11) NOT NULL,
  `project_id` int(11) NOT NULL,
  `title` varchar(255) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `status_id` int(11) NOT NULL,
  `assigned_to` varchar(255) NOT NULL,
  `priority` enum('low','normal','high','urgent') NOT NULL,
  `progress_percent` decimal(5,2) DEFAULT 0.00,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

--
-- Dumping data for table `tb_project_tasks`
--

INSERT INTO `tb_project_tasks` (`id`, `project_id`, `title`, `description`, `status_id`, `assigned_to`, `priority`, `progress_percent`, `created_at`, `updated_at`) VALUES
(2, 1, 'ฟังชั่น คำนวณสถิติ', 'ฟังชั่น คำนวณสถิติ', 4, 'f2abe56e-aa89-11f0-a734-00be43e7be05', 'urgent', 66.67, '2025-10-25 03:55:57', '2025-10-31 06:30:34'),
(3, 1, 'kkk', 'asdasd', 3, 'f2abe56e-aa89-11f0-a734-00be43e7be05', 'high', 100.00, '2025-10-31 04:54:10', '2025-10-31 09:49:51'),
(4, 1, 'ด่วน', 'ดดดดด', 5, 'f2abe56e-aa89-11f0-a734-00be43e7be05', 'urgent', 100.00, '2025-10-31 07:08:23', '2025-10-31 07:09:12');

-- --------------------------------------------------------

--
-- Table structure for table `tb_project_task_comments`
--

CREATE TABLE `tb_project_task_comments` (
  `id` int(11) NOT NULL,
  `task_id` int(11) NOT NULL,
  `user_id` varchar(255) NOT NULL,
  `message` text NOT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

--
-- Dumping data for table `tb_project_task_comments`
--

INSERT INTO `tb_project_task_comments` (`id`, `task_id`, `user_id`, `message`, `created_at`, `updated_at`) VALUES
(8, 2, 'f5928e80-a97d-11f0-b354-00be43e7be05', 'สวัสดีครับ', '2025-10-31 02:19:32', '2025-10-31 02:19:32'),
(9, 2, 'f2abe56e-aa89-11f0-a734-00be43e7be05', 'จ้าาา', '2025-10-31 02:19:44', '2025-10-31 02:19:44'),
(10, 2, 'f2abe56e-aa89-11f0-a734-00be43e7be05', '555', '2025-10-31 03:21:32', '2025-10-31 03:21:32');

-- --------------------------------------------------------

--
-- Table structure for table `tb_project_task_logs`
--

CREATE TABLE `tb_project_task_logs` (
  `id` int(11) NOT NULL,
  `task_id` int(10) NOT NULL,
  `subtask_id` int(10) DEFAULT NULL,
  `changed_by` varchar(255) DEFAULT NULL,
  `old_status_id` int(10) NOT NULL,
  `new_status_id` int(10) NOT NULL,
  `old_progress` decimal(5,2) NOT NULL,
  `new_progress` decimal(5,2) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

--
-- Dumping data for table `tb_project_task_logs`
--

INSERT INTO `tb_project_task_logs` (`id`, `task_id`, `subtask_id`, `changed_by`, `old_status_id`, `new_status_id`, `old_progress`, `new_progress`, `created_at`) VALUES
(3, 2, 6, 'f2abe56e-aa89-11f0-a734-00be43e7be05', 2, 2, 0.00, 0.00, '2025-10-31 02:41:36'),
(4, 2, 6, 'f2abe56e-aa89-11f0-a734-00be43e7be05', 2, 2, 0.00, 55.00, '2025-10-31 02:41:55'),
(5, 2, 6, 'f2abe56e-aa89-11f0-a734-00be43e7be05', 2, 2, 55.00, 35.00, '2025-10-31 02:42:28'),
(6, 2, 6, 'f2abe56e-aa89-11f0-a734-00be43e7be05', 2, 2, 35.00, 60.00, '2025-10-31 02:45:53'),
(7, 2, 6, 'f2abe56e-aa89-11f0-a734-00be43e7be05', 2, 2, 60.00, 75.00, '2025-10-31 02:51:30'),
(8, 2, 7, 'f2abe56e-aa89-11f0-a734-00be43e7be05', 4, 4, 0.00, 0.00, '2025-10-31 02:51:53'),
(9, 2, 6, 'f2abe56e-aa89-11f0-a734-00be43e7be05', 2, 2, 75.00, 50.00, '2025-10-31 02:56:44'),
(10, 2, 6, 'f2abe56e-aa89-11f0-a734-00be43e7be05', 2, 2, 50.00, 60.00, '2025-10-31 03:07:30'),
(11, 2, 6, 'f2abe56e-aa89-11f0-a734-00be43e7be05', 2, 2, 60.00, 30.00, '2025-10-31 03:11:21'),
(12, 2, 6, 'f2abe56e-aa89-11f0-a734-00be43e7be05', 2, 2, 30.00, 80.00, '2025-10-31 03:16:02'),
(13, 2, 8, 'f2abe56e-aa89-11f0-a734-00be43e7be05', 4, 4, 0.00, 0.00, '2025-10-31 03:54:54'),
(14, 2, 8, 'f2abe56e-aa89-11f0-a734-00be43e7be05', 4, 4, 0.00, 85.00, '2025-10-31 04:10:47'),
(15, 2, 6, 'f2abe56e-aa89-11f0-a734-00be43e7be05', 2, 2, 80.00, 100.00, '2025-10-31 04:49:07'),
(16, 2, 6, 'f2abe56e-aa89-11f0-a734-00be43e7be05', 2, 2, 100.00, 10.00, '2025-10-31 04:49:21'),
(17, 2, 8, 'f2abe56e-aa89-11f0-a734-00be43e7be05', 4, 4, 85.00, 100.00, '2025-10-31 04:53:03'),
(18, 3, 9, 'f2abe56e-aa89-11f0-a734-00be43e7be05', 3, 3, 0.00, 0.00, '2025-10-31 04:54:25'),
(19, 3, 9, 'f2abe56e-aa89-11f0-a734-00be43e7be05', 3, 3, 0.00, 5.00, '2025-10-31 04:54:48'),
(20, 3, 9, 'f2abe56e-aa89-11f0-a734-00be43e7be05', 3, 3, 5.00, 15.00, '2025-10-31 04:55:07'),
(21, 3, 9, 'f2abe56e-aa89-11f0-a734-00be43e7be05', 3, 3, 15.00, 50.00, '2025-10-31 04:55:37'),
(22, 3, 10, 'f2abe56e-aa89-11f0-a734-00be43e7be05', 3, 3, 0.00, 0.00, '2025-10-31 04:56:05'),
(23, 3, 10, 'f2abe56e-aa89-11f0-a734-00be43e7be05', 3, 3, 0.00, 80.00, '2025-10-31 04:56:21'),
(24, 3, 10, 'f5928e80-a97d-11f0-b354-00be43e7be05', 3, 3, 80.00, 55.00, '2025-10-31 04:57:21'),
(25, 3, 11, 'f2abe56e-aa89-11f0-a734-00be43e7be05', 3, 3, 0.00, 0.00, '2025-10-31 06:03:23'),
(26, 3, 9, 'f2abe56e-aa89-11f0-a734-00be43e7be05', 3, 3, 50.00, 100.00, '2025-10-31 06:14:17'),
(27, 3, 10, 'f2abe56e-aa89-11f0-a734-00be43e7be05', 3, 3, 55.00, 100.00, '2025-10-31 06:15:17'),
(28, 3, 11, 'f2abe56e-aa89-11f0-a734-00be43e7be05', 3, 3, 0.00, 100.00, '2025-10-31 06:15:39'),
(29, 2, 6, 'f2abe56e-aa89-11f0-a734-00be43e7be05', 2, 2, 10.00, 100.00, '2025-10-31 06:30:34'),
(30, 4, 12, 'f2abe56e-aa89-11f0-a734-00be43e7be05', 5, 5, 0.00, 0.00, '2025-10-31 07:08:50'),
(31, 4, 12, 'f2abe56e-aa89-11f0-a734-00be43e7be05', 5, 5, 0.00, 100.00, '2025-10-31 07:09:12'),
(32, 3, 11, 'f2abe56e-aa89-11f0-a734-00be43e7be05', 3, 3, 100.00, 65.00, '2025-10-31 09:45:58'),
(33, 3, 11, 'f2abe56e-aa89-11f0-a734-00be43e7be05', 3, 3, 65.00, 100.00, '2025-10-31 09:46:00'),
(34, 3, 13, 'f2abe56e-aa89-11f0-a734-00be43e7be05', 3, 3, 0.00, 0.00, '2025-10-31 09:49:38'),
(35, 3, 13, 'f2abe56e-aa89-11f0-a734-00be43e7be05', 3, 3, 0.00, 100.00, '2025-10-31 09:49:51');

-- --------------------------------------------------------

--
-- Table structure for table `tb_project_task_statuses`
--

CREATE TABLE `tb_project_task_statuses` (
  `id` int(11) NOT NULL,
  `project_id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `color` varchar(10) DEFAULT NULL,
  `order_index` int(11) DEFAULT 0,
  `is_default` tinyint(1) DEFAULT 0,
  `is_done` tinyint(1) DEFAULT 0,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

--
-- Dumping data for table `tb_project_task_statuses`
--

INSERT INTO `tb_project_task_statuses` (`id`, `project_id`, `name`, `color`, `order_index`, `is_default`, `is_done`, `created_at`, `updated_at`) VALUES
(1, 1, 'Ideas', '#d6dfaa', 1, 1, 0, '2025-10-25 03:44:49', '2025-10-25 03:44:49'),
(2, 1, 'To Do', '#083172', 2, 0, 0, '2025-10-25 03:44:49', '2025-10-25 03:44:49'),
(3, 1, 'Doing', '#560e77', 3, 0, 0, '2025-10-25 03:44:49', '2025-10-25 03:44:49'),
(4, 1, 'Waiting', '#6c0f13', 3, 0, 0, '2025-10-25 03:44:49', '2025-10-31 06:23:45'),
(5, 1, 'Done', '#1a5809', 4, 0, 0, '2025-10-25 03:44:49', '2025-10-31 06:23:45'),
(6, 1, 'Archived', '#4f613d', 5, 0, 1, '2025-10-25 03:44:49', '2025-10-31 06:23:45');

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
('f2abe56e-aa89-11f0-a734-00be43e7be05', 'admin', '$argon2id$v=19$m=65536,t=3,p=4$mebiiiZOIQEjLgrmNbBgbA$CVMPCjQy6xOmSFfuX/UN/WMpaBnBZqy1gusj19WYm4Y', 'admin admin', 'admin@gmail.com', 'IT', 'IT', NULL, 1, 1, 0, '2025-10-16 12:16:30', 'f5928e80-a97d-11f0-b354-00be43e7be05', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJmMmFiZTU2ZS1hYTg5LTExZjAtYTczNC0wMGJlNDNlN2JlMDUiLCJlbWFpbCI6ImFkbWluQGdtYWlsLmNvbSIsInJvbGVzIjpbImFkbWluIiwic3RhZmYiXSwiaWF0IjoxNzYxODc3NjAzLCJleHAiOjE3NjI0ODI0MDN9.IglBCDeyklwGdtIgxQ1HHuKAEtIdg3EdPf1bCNhz2', 'ATC'),
('f5928e80-a97d-11f0-b354-00be43e7be05', '680042', '$argon2id$v=19$m=65536,t=3,p=4$WH3URMmH4kknR9X4a6+S+g$/q0UqS4pSB9IawJqnUio6pebcL/QD0K5hS+cKCQ9ZrI', 'วสุโชค ใจน้ำ', 'wasuchokop@gmail.com', 'IT', 'STAFF', 'uploads\\images\\users\\1760501889720.jpg', 1, 1, 0, '2025-10-15 04:18:10', NULL, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJmNTkyOGU4MC1hOTdkLTExZjAtYjM1NC0wMGJlNDNlN2JlMDUiLCJlbWFpbCI6Indhc3VjaG9rb3BAZ21haWwuY29tIiwicm9sZXMiOlsiYWRtaW4iLCJzdGFmZiJdLCJpYXQiOjE3NjE4ODY2MjAsImV4cCI6MTc2MjQ5MTQyMH0.h4CRv9TcQ7pno60MD6lx-Xx-NwNkMX-lUL', 'ATC');

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
-- Indexes for table `tb_project_sub_tasks`
--
ALTER TABLE `tb_project_sub_tasks`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_sub_task_task_id` (`task_id`),
  ADD KEY `fk_sub_task_status_id` (`status_id`);

--
-- Indexes for table `tb_project_sub_task_assignees`
--
ALTER TABLE `tb_project_sub_task_assignees`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_project_sub_task_sub_task_id` (`subtask_id`),
  ADD KEY `fk_project_user_id` (`user_id`);

--
-- Indexes for table `tb_project_tasks`
--
ALTER TABLE `tb_project_tasks`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_tasks_project_id` (`project_id`),
  ADD KEY `fk_tasks_status_id` (`status_id`),
  ADD KEY `fk_tasks_assignedto` (`assigned_to`);

--
-- Indexes for table `tb_project_task_comments`
--
ALTER TABLE `tb_project_task_comments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_task_comments_task_id` (`task_id`),
  ADD KEY `fk_task_comments_user_id` (`user_id`);

--
-- Indexes for table `tb_project_task_logs`
--
ALTER TABLE `tb_project_task_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_task_log_task_id` (`task_id`),
  ADD KEY `fk_task_log_subtask_id` (`subtask_id`),
  ADD KEY `fk_task_log_change_by` (`changed_by`);

--
-- Indexes for table `tb_project_task_statuses`
--
ALTER TABLE `tb_project_task_statuses`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_task_project_id` (`project_id`);

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
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `tb_project_projects`
--
ALTER TABLE `tb_project_projects`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `tb_project_sub_tasks`
--
ALTER TABLE `tb_project_sub_tasks`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=14;

--
-- AUTO_INCREMENT for table `tb_project_sub_task_assignees`
--
ALTER TABLE `tb_project_sub_task_assignees`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=21;

--
-- AUTO_INCREMENT for table `tb_project_tasks`
--
ALTER TABLE `tb_project_tasks`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `tb_project_task_comments`
--
ALTER TABLE `tb_project_task_comments`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT for table `tb_project_task_logs`
--
ALTER TABLE `tb_project_task_logs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=36;

--
-- AUTO_INCREMENT for table `tb_project_task_statuses`
--
ALTER TABLE `tb_project_task_statuses`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

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
-- Constraints for table `tb_project_sub_tasks`
--
ALTER TABLE `tb_project_sub_tasks`
  ADD CONSTRAINT `fk_sub_task_status_id` FOREIGN KEY (`status_id`) REFERENCES `tb_project_task_statuses` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  ADD CONSTRAINT `fk_sub_task_task_id` FOREIGN KEY (`task_id`) REFERENCES `tb_project_tasks` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

--
-- Constraints for table `tb_project_sub_task_assignees`
--
ALTER TABLE `tb_project_sub_task_assignees`
  ADD CONSTRAINT `fk_project_sub_task_sub_task_id` FOREIGN KEY (`subtask_id`) REFERENCES `tb_project_sub_tasks` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  ADD CONSTRAINT `fk_project_user_id` FOREIGN KEY (`user_id`) REFERENCES `user_account` (`user_id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

--
-- Constraints for table `tb_project_tasks`
--
ALTER TABLE `tb_project_tasks`
  ADD CONSTRAINT `fk_tasks_assignedto` FOREIGN KEY (`assigned_to`) REFERENCES `user_account` (`user_id`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  ADD CONSTRAINT `fk_tasks_project_id` FOREIGN KEY (`project_id`) REFERENCES `tb_project_projects` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  ADD CONSTRAINT `fk_tasks_status_id` FOREIGN KEY (`status_id`) REFERENCES `tb_project_task_statuses` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

--
-- Constraints for table `tb_project_task_comments`
--
ALTER TABLE `tb_project_task_comments`
  ADD CONSTRAINT `fk_task_comments_task_id` FOREIGN KEY (`task_id`) REFERENCES `tb_project_tasks` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_task_comments_user_id` FOREIGN KEY (`user_id`) REFERENCES `user_account` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `tb_project_task_logs`
--
ALTER TABLE `tb_project_task_logs`
  ADD CONSTRAINT `fk_task_log_change_by` FOREIGN KEY (`changed_by`) REFERENCES `user_account` (`user_id`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  ADD CONSTRAINT `fk_task_log_subtask_id` FOREIGN KEY (`subtask_id`) REFERENCES `tb_project_sub_tasks` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  ADD CONSTRAINT `fk_task_log_task_id` FOREIGN KEY (`task_id`) REFERENCES `tb_project_tasks` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

--
-- Constraints for table `tb_project_task_statuses`
--
ALTER TABLE `tb_project_task_statuses`
  ADD CONSTRAINT `fk_task_project_id` FOREIGN KEY (`project_id`) REFERENCES `tb_project_projects` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

--
-- Constraints for table `user_account`
--
ALTER TABLE `user_account`
  ADD CONSTRAINT `fk_create_by` FOREIGN KEY (`create_by`) REFERENCES `user_account` (`user_id`) ON DELETE NO ACTION ON UPDATE NO ACTION;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
