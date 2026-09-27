import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from db.database import get_db_connection

conn = get_db_connection()
cur = conn.cursor()
cur.execute("DELETE FROM alerts WHERE user_id = %s;", ("test_resp_user",))
cur.execute("DELETE FROM transactions WHERE user_id = %s;", ("test_resp_user",))
cur.execute("DELETE FROM constants WHERE user_id = %s;", ("test_resp_user",))
cur.execute("DELETE FROM users WHERE user_id = %s;", ("test_resp_user",))
conn.commit()
cur.close()
conn.close()
print("CLEANUP_COMPLETE")
