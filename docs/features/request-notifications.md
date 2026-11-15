# Request notification decisions

Friend, game join, game leave, club join and club leave notifications reflect the
saved request outcome. Completed requests show a confirmation instead of approval
buttons, including after reloading or opening notifications on another device.
Marking a notification as read does not accept its request.

Club join requests notify all active members. Existing pending join memberships
are backfilled by the migration. Active members may accept join requests as before.

Leaving a club now requires approval from another active member. The requester
stays in the roster, occupies a slot and retains chat access until approval.
Declining leaves membership unchanged. Owners must transfer ownership first.
Pending join requests can still be cancelled immediately.

Active members can approve or decline leave requests in Notifications or
Manage Club → Requests. A member cannot review their own leave request.
Request IDs keep older decisions separate from later requests. Club row locks
serialize reviews; repeat approvals fail without changing membership or points.

Deploy both club request migrations before using the updated client. These
changes do not alter game leave penalties or club acceptance point awards.
