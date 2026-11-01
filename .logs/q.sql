select (select count(*) from "Organization") as orgs,
 (select count(*) from "User") as users,
 (select count(*) from "Project") as projects,
 (select count(*) from "Unit") as units,
 (select count(*) from "Lead") as leads,
 (select count(*) from "Booking") as bookings,
 (select count(*) from "Payment") as payments,
 (select count(*) from "Customer") as customers;
