-- phpMyAdmin SQL Dump
-- version 4.2.7.1
-- http://www.phpmyadmin.net
--
-- Host: localhost
-- Generation Time: 2014 年 10 月 22 日 09:15
-- サーバのバージョン： 5.6.20
-- PHP Version: 5.5.15

SET FOREIGN_KEY_CHECKS=0;
SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8 */;

--
-- Database: `sashimi`
--

DELIMITER $$
--
-- プロシージャ
--
DROP PROCEDURE IF EXISTS `TRUNCATE ALL`$$
CREATE DEFINER=`root`@`localhost` PROCEDURE `TRUNCATE ALL`()
    MODIFIES SQL DATA
    DETERMINISTIC
BEGIN
DELETE FROM `projects`;
ALTER TABLE `projects` AUTO_INCREMENT = 1;
ALTER TABLE `tasks` AUTO_INCREMENT = 1;
ALTER TABLE `tickets` AUTO_INCREMENT = 1;
ALTER TABLE `data` AUTO_INCREMENT = 1;
ALTER TABLE `files` AUTO_INCREMENT = 1;
ALTER TABLE `error_reports` AUTO_INCREMENT = 1;
END$$

DELIMITER ;

-- --------------------------------------------------------

--
-- テーブルの構造 `data`
--

DROP TABLE IF EXISTS `data`;
CREATE TABLE IF NOT EXISTS `data` (
`id` int(10) unsigned NOT NULL,
  `project_id` int(10) unsigned NOT NULL,
  `content` longtext NOT NULL,
  `created` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- --------------------------------------------------------

--
-- テーブルの構造 `error_reports`
--

DROP TABLE IF EXISTS `error_reports`;
CREATE TABLE IF NOT EXISTS `error_reports` (
`id` int(10) unsigned NOT NULL,
  `ticket_id` int(10) unsigned NOT NULL,
  `type` enum('static_code','code') NOT NULL,
  `message` text NOT NULL,
  `stack` text,
  `created` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- --------------------------------------------------------

--
-- テーブルの構造 `files`
--

DROP TABLE IF EXISTS `files`;
CREATE TABLE IF NOT EXISTS `files` (
`id` int(10) unsigned NOT NULL,
  `project_id` int(10) unsigned NOT NULL,
  `content` longblob NOT NULL,
  `created` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- --------------------------------------------------------

--
-- テーブルの構造 `projects`
--

DROP TABLE IF EXISTS `projects`;
CREATE TABLE IF NOT EXISTS `projects` (
`id` int(10) unsigned NOT NULL,
  `name` varchar(255) NOT NULL,
  `created` datetime DEFAULT NULL,
  `modified` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- --------------------------------------------------------

--
-- ビュー用の代替構造 `project_error_reports_statistics`
--
DROP VIEW IF EXISTS `project_error_reports_statistics`;
CREATE TABLE IF NOT EXISTS `project_error_reports_statistics` (
`project_id` int(10) unsigned
,`error_reports_count` bigint(21)
);
-- --------------------------------------------------------

--
-- ビュー用の代替構造 `project_task_ticket_statistics`
--
DROP VIEW IF EXISTS `project_task_ticket_statistics`;
CREATE TABLE IF NOT EXISTS `project_task_ticket_statistics` (
`project_id` int(10) unsigned
,`name` varchar(255)
,`tasks_count` bigint(21)
,`free_tickets_count` decimal(23,0)
,`calculating_tickets_count` decimal(23,0)
,`finished_tickets_count` decimal(23,0)
,`reduced_tickets_count` decimal(23,0)
);
-- --------------------------------------------------------

--
-- テーブルの構造 `tasks`
--

DROP TABLE IF EXISTS `tasks`;
CREATE TABLE IF NOT EXISTS `tasks` (
`id` int(10) unsigned NOT NULL,
  `project_id` int(10) unsigned NOT NULL,
  `code` longtext NOT NULL,
  `static_code` longtext NOT NULL,
  `created` datetime DEFAULT NULL,
  `modified` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- --------------------------------------------------------

--
-- テーブルの構造 `tickets`
--

DROP TABLE IF EXISTS `tickets`;
CREATE TABLE IF NOT EXISTS `tickets` (
`id` int(10) unsigned NOT NULL,
  `task_id` int(10) unsigned NOT NULL,
  `input` longtext NOT NULL,
  `output` longtext,
  `status` enum('free','calculating','finished','reduced') NOT NULL DEFAULT 'free',
  `created` datetime DEFAULT NULL,
  `modified` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- --------------------------------------------------------

--
-- ビュー用の構造 `project_error_reports_statistics`
--
DROP TABLE IF EXISTS `project_error_reports_statistics`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `project_error_reports_statistics` AS select `projects`.`id` AS `project_id`,count(`error_reports`.`id`) AS `error_reports_count` from (((`projects` left join `tasks` on((`tasks`.`project_id` = `projects`.`id`))) left join `tickets` on((`tickets`.`task_id` = `tasks`.`id`))) left join `error_reports` on((`error_reports`.`ticket_id` = `tickets`.`id`))) group by `projects`.`id`;

-- --------------------------------------------------------

--
-- ビュー用の構造 `project_task_ticket_statistics`
--
DROP TABLE IF EXISTS `project_task_ticket_statistics`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `project_task_ticket_statistics` AS select `projects`.`id` AS `project_id`,`projects`.`name` AS `name`,count(distinct `tasks`.`id`) AS `tasks_count`,sum((case when (`tickets`.`status` = 'free') then 1 else 0 end)) AS `free_tickets_count`,sum((case when (`tickets`.`status` = 'calculating') then 1 else 0 end)) AS `calculating_tickets_count`,sum((case when (`tickets`.`status` = 'finished') then 1 else 0 end)) AS `finished_tickets_count`,sum((case when (`tickets`.`status` = 'reduced') then 1 else 0 end)) AS `reduced_tickets_count` from ((`projects` left join `tasks` on((`tasks`.`project_id` = `projects`.`id`))) left join `tickets` on((`tickets`.`task_id` = `tasks`.`id`))) group by `projects`.`id`;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `data`
--
ALTER TABLE `data`
 ADD PRIMARY KEY (`id`), ADD KEY `project_id` (`project_id`);

--
-- Indexes for table `error_reports`
--
ALTER TABLE `error_reports`
 ADD PRIMARY KEY (`id`), ADD KEY `ticket_id` (`ticket_id`);

--
-- Indexes for table `files`
--
ALTER TABLE `files`
 ADD PRIMARY KEY (`id`), ADD KEY `project_id` (`project_id`);

--
-- Indexes for table `projects`
--
ALTER TABLE `projects`
 ADD PRIMARY KEY (`id`);

--
-- Indexes for table `tasks`
--
ALTER TABLE `tasks`
 ADD PRIMARY KEY (`id`), ADD KEY `project_id` (`project_id`);

--
-- Indexes for table `tickets`
--
ALTER TABLE `tickets`
 ADD PRIMARY KEY (`id`), ADD KEY `task_id` (`task_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `data`
--
ALTER TABLE `data`
MODIFY `id` int(10) unsigned NOT NULL AUTO_INCREMENT;
--
-- AUTO_INCREMENT for table `error_reports`
--
ALTER TABLE `error_reports`
MODIFY `id` int(10) unsigned NOT NULL AUTO_INCREMENT;
--
-- AUTO_INCREMENT for table `files`
--
ALTER TABLE `files`
MODIFY `id` int(10) unsigned NOT NULL AUTO_INCREMENT;
--
-- AUTO_INCREMENT for table `projects`
--
ALTER TABLE `projects`
MODIFY `id` int(10) unsigned NOT NULL AUTO_INCREMENT;
--
-- AUTO_INCREMENT for table `tasks`
--
ALTER TABLE `tasks`
MODIFY `id` int(10) unsigned NOT NULL AUTO_INCREMENT;
--
-- AUTO_INCREMENT for table `tickets`
--
ALTER TABLE `tickets`
MODIFY `id` int(10) unsigned NOT NULL AUTO_INCREMENT;
--
-- ダンプしたテーブルの制約
--

--
-- テーブルの制約 `data`
--
ALTER TABLE `data`
ADD CONSTRAINT `data_ibfk_1` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- テーブルの制約 `error_reports`
--
ALTER TABLE `error_reports`
ADD CONSTRAINT `error_reports_ibfk_1` FOREIGN KEY (`ticket_id`) REFERENCES `tickets` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- テーブルの制約 `files`
--
ALTER TABLE `files`
ADD CONSTRAINT `files_ibfk_1` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- テーブルの制約 `tasks`
--
ALTER TABLE `tasks`
ADD CONSTRAINT `tasks_ibfk_1` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- テーブルの制約 `tickets`
--
ALTER TABLE `tickets`
ADD CONSTRAINT `tickets_ibfk_1` FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;
SET FOREIGN_KEY_CHECKS=1;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
