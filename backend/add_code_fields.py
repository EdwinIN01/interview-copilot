import sqlite3
import os

db_path = os.path.join(os.path.dirname(__file__), 'data', 'interview.db')
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

try:
    cursor.execute('ALTER TABLE interviews ADD COLUMN code_content TEXT')
    print('已添加 code_content 字段')
except Exception as e:
    print(f'code_content: {e}')

try:
    cursor.execute("ALTER TABLE interviews ADD COLUMN code_language VARCHAR(20) DEFAULT 'python'")
    print('已添加 code_language 字段')
except Exception as e:
    print(f'code_language: {e}')

conn.commit()
conn.close()
print('数据库更新完成')
