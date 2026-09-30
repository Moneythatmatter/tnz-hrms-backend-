-- Employee portal login users — link users.email to hr_employees.email
-- Run AFTER: auth-users-schema.sql, human-resources-seeds-shaw-hotel.sql
-- Default password for all demo employees: 123456

insert into users (id, name, email, password_hash, role, initials, status) values
  (
    'U-EMP-0101',
    'Rajesh Kumar',
    'rajesh.kumar@shawhotel.com',
    '$2b$10$YRx65m7Qb/hI/3YLOSfv2u6CLH7KmmPHfi0n9FHDXz4uHY4OLnciy',
    'Staff',
    'RK',
    'Active'
  ),
  (
    'U-EMP-0102',
    'Priya Patel',
    'priya.patel@shawhotel.com',
    '$2b$10$YRx65m7Qb/hI/3YLOSfv2u6CLH7KmmPHfi0n9FHDXz4uHY4OLnciy',
    'Staff',
    'PP',
    'Active'
  ),
  (
    'U-EMP-0103',
    'Anjali Sharma',
    'anjali.sharma@shawhotel.com',
    '$2b$10$YRx65m7Qb/hI/3YLOSfv2u6CLH7KmmPHfi0n9FHDXz4uHY4OLnciy',
    'Staff',
    'AS',
    'Active'
  ),
  (
    'U-EMP-0104',
    'Vikramjit Singh',
    'vikram@shawhotel.com',
    '$2b$10$YRx65m7Qb/hI/3YLOSfv2u6CLH7KmmPHfi0n9FHDXz4uHY4OLnciy',
    'Staff',
    'VS',
    'Active'
  ),
  (
    'U-EMP-0105',
    'Arjun Verma',
    'arjun.verma@shawhotel.com',
    '$2b$10$YRx65m7Qb/hI/3YLOSfv2u6CLH7KmmPHfi0n9FHDXz4uHY4OLnciy',
    'Staff',
    'AV',
    'Active'
  )
on conflict (email) do update set
  name = excluded.name,
  password_hash = excluded.password_hash,
  role = excluded.role,
  initials = excluded.initials,
  status = excluded.status;
