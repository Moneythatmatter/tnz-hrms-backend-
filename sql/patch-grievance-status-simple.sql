-- Optional: normalize existing hr_complaints rows to Submitted | Pending | Closed

update hr_complaints
set status = 'Closed'
where lower(trim(status)) in ('closed', 'resolved', 'rejected');

update hr_complaints
set status = 'Submitted'
where lower(trim(status)) in ('submitted', 'open', '')
   or status is null;

update hr_complaints
set status = 'Pending'
where status not in ('Submitted', 'Pending', 'Closed');
