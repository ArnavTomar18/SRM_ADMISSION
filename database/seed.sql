USE srm_admission;

INSERT INTO campuses (name, location) VALUES
  ('SRM Kattankulathur', 'Chennai'),
  ('SRM Ramapuram', 'Chennai'),
  ('SRM NCR', 'Ghaziabad'),
  ('SRM AP', 'Amaravati')
ON DUPLICATE KEY UPDATE location = VALUES(location);

INSERT INTO programs (campus_id, name, seat_capacity, min_cutoff) VALUES
  (1, 'B.Tech Computer Science and Engineering', 120, 75.00),
  (1, 'B.Tech Artificial Intelligence and Data Science', 90, 78.00),
  (2, 'B.Tech Electronics and Communication Engineering', 60, 68.00),
  (2, 'BBA', 80, 55.00),
  (3, 'B.Tech Mechanical Engineering', 50, 60.00),
  (4, 'B.Tech Civil Engineering', 45, 58.00)
ON DUPLICATE KEY UPDATE
  seat_capacity = VALUES(seat_capacity),
  min_cutoff = VALUES(min_cutoff);
