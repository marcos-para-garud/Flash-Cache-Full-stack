# 🔥 Redis Crash Recovery Test Guide

## Overview
This guide demonstrates how your Redis clone handles **crash recovery** using RDB persistence. Your system automatically saves data every 30 seconds and loads it on startup.

---

## 🎯 **What We're Testing**

✅ **Automatic Data Persistence** - Data survives system crashes  
✅ **TTL Recovery** - Expiration timers restart correctly after crash  
✅ **Cluster Integrity** - All 3 nodes (node1, node2, node3) recover independently  
✅ **Consistent Hashing** - Keys remain on correct nodes after restart  

---

## 🧪 **Manual Testing Steps**

### **Prerequisites**
```bash
# 1. Start the API server
node apiServer.js

# 2. Start the UI (in another terminal)
cd redis-ui && npm start
```

### **STEP 1: Add Test Data** 🚀
Go to **Key Explorer** in the UI and add these test keys:

```
Key: crash_test_1    Value: "Hello World!"           TTL: None
Key: crash_test_2    Value: "Persistent Data"        TTL: None  
Key: crash_test_ttl  Value: "Will expire in 2min"    TTL: 120 seconds
Key: crash_test_list Value: ["item1","item2"]        TTL: None
Key: temp_key        Value: "Will expire soon"       TTL: 10 seconds
```

**Alternative - Use CLI Console:**
```
SET crash_test_1 "Hello World!"
SET crash_test_2 "Persistent Data"
EXPIRE crash_test_ttl 120
```

### **STEP 2: Force Save Before Crash** ⏱️
- Go to **RDB Persistence** tab
- Click **"Save to Disk"** button
- Verify success message appears
- Note the timestamps on RDB files

### **STEP 3: Verify Data Distribution** 📊
Check which node each key is on:
```bash
# Check server logs - you'll see routing messages like:
# "Routing key 'crash_test_1' to node: node2"
```

### **STEP 4: Check RDB Files** 📁
```bash
# Check file sizes and timestamps
ls -la data_node*.json

# View actual content
cat data_node1.json | jq '.'
cat data_node2.json | jq '.'  
cat data_node3.json | jq '.'
```

### **STEP 5: SIMULATE CRASH** 💥
```bash
# Stop the API server (Ctrl+C)
# This simulates a system crash
```

### **STEP 6: Verify Persistence During Downtime** 🔄
```bash
# While server is down, check RDB files still exist:
ls -la data_node*.json

# Data should still be there:
cat data_node1.json | jq '.store | length'  # Number of keys
cat data_node1.json | jq '.expiry | length' # Number of TTL entries
```

### **STEP 7: RESTART SYSTEM** 🚀
```bash
# Restart API server
node apiServer.js

# Watch the startup logs for:
# - "API server running at http://localhost:3001"
# - No error messages about loading RDB files
```

### **STEP 8: VERIFY RECOVERY** ✅
Go back to **Key Explorer** and check:

- ✅ **crash_test_1** should still exist with same value
- ✅ **crash_test_2** should still exist  
- ✅ **crash_test_ttl** should exist with reduced TTL
- ✅ **crash_test_list** should be intact
- ❌ **temp_key** should be gone (expired during crash)

**Alternative - Use CLI:**
```
GET crash_test_1      # Should return "Hello World!"
GET crash_test_2      # Should return "Persistent Data"  
TTL crash_test_ttl    # Should show remaining seconds
GET temp_key          # Should return null (expired)
```

---

## 🔍 **What Happens Behind the Scenes**

### **During Save (Every 30 seconds + Manual)**
1. Each node calls `saveToFile()`
2. Data serialized: `{store: [...], expiry: [...]}`
3. Written to: `data_node1.json`, `data_node2.json`, `data_node3.json`

### **During Crash Recovery**
1. Each node constructor calls `loadFromFile()`
2. Reads RDB file if exists
3. Restores `store` (key-value pairs)
4. Restores `expiry` (TTL data)
5. Restart TTL workers for unexpired keys
6. Delete keys that expired during downtime

### **File Structure Example**
```json
{
  "store": [
    ["crash_test_1", "Hello World!"],
    ["crash_test_ttl", "Will expire in 2min"]
  ],
  "expiry": [
    ["crash_test_ttl", 1699123456789]
  ]
}
```

---

## 🚨 **Expected Results**

### **✅ Success Indicators:**
- All non-TTL keys survive crash
- TTL keys with remaining time survive with correct countdown
- Expired TTL keys are cleaned up
- Keys remain on same nodes (consistent hashing preserved)
- No data corruption or loss

### **❌ Failure Indicators:**
- Keys missing after restart
- TTL keys not expiring at correct time
- Keys appearing on wrong nodes
- RDB file corruption errors
- System fails to start

---

## 🎓 **Advanced Testing Scenarios**

### **Test TTL Edge Cases:**
```bash
# Add key that expires during crash
EXPIRE test_during_crash 5
# Stop server for 10 seconds
# Restart - key should be gone
```

### **Test Large Dataset:**
```bash
# Add 100 keys before crash
for i in {1..100}; do
  curl -X POST http://localhost:3001/api/keys \
    -H "Content-Type: application/json" \
    -d "{\"key\":\"bulk_test_$i\", \"value\":\"data_$i\"}"
done
```

### **Test Node-Specific Recovery:**
- Add keys that hash to specific nodes
- Check they remain on same nodes after restart

---

## 📊 **Monitoring Recovery**

Check the **Process Monitor** tab to see:
- ✅ All 3 RDB child processes active
- ✅ TTL worker threads running  
- ✅ No error indicators
- ✅ Proper save/load metrics

---

## 🏁 **Conclusion**

This demonstrates **real Redis-like persistence** with:
- **Durability**: Data survives crashes
- **Performance**: Non-blocking persistence via child processes
- **Scalability**: Each cluster node has independent RDB files  
- **Reliability**: TTL recovery and expiration handling
- **Consistency**: Distributed data remains properly partitioned 