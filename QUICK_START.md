# Quick Start Guide

## 🚀 Get Started in 5 Minutes

### Option 1: OpenAI Cloud (Fastest Setup)

1. **Install Extension**
   - Load unpacked extension in Chrome
   - Pin to toolbar

2. **Configure API**
   - Click extension → Settings
   - Select "OpenAI (Cloud)"
   - Enter your OpenAI API key
   - Test connection

3. **Start Recording**
   - Grant microphone access
   - Click "Start Recording"
   - Click "Process Audio" when done

### Option 2: Local Models (Privacy + Cost-Free)

1. **Setup Local APIs** (One-time, ~15 minutes)
   ```bash
   chmod +x setup_all_apis.sh
   ./setup_all_apis.sh
   ```

2. **Start APIs**
   ```bash
   ./start_apis.sh
   ```

3. **Configure Extension**
   - Click extension → Settings
   - Select "Local Models (HuggingFace)"
   - Test Local APIs

4. **Start Recording**
   - Same as Option 1

### Option 3: Hybrid Mode (Best of Both)

1. **Complete both Option 1 and 2**
2. **Select "Hybrid" in settings**
3. **Enjoy local processing with cloud fallback**

## 🎯 Essential Commands

```bash
# Check if APIs are running
./status_apis.sh

# Start APIs
./start_apis.sh

# Stop APIs
./stop_apis.sh

# View logs
tail -f logs/transcription.log
tail -f logs/summarization.log
```

## 🔧 First Time Setup Checklist

- [ ] Chrome extension installed and pinned
- [ ] Microphone permission granted
- [ ] API provider selected and configured
- [ ] Test recording completed successfully
- [ ] Medical templates configured (optional)

## 💡 Pro Tips

- **Local Mode**: First run downloads models (~5GB), be patient
- **Hybrid Mode**: Best for reliability and cost savings
- **Templates**: Use medical templates for better summaries
- **Audio Quality**: Higher quality = better transcription accuracy
- **Language**: Set to Indonesian for medical terminology

## 🆘 Quick Troubleshooting

| Problem | Solution |
|---------|----------|
| Microphone not working | Check browser permissions |
| OpenAI errors | Verify API key and credits |
| Local APIs not responding | Run `./start_apis.sh` |
| Poor transcription | Increase audio quality |
| Extension not injecting | Refresh the webpage |

## 📞 Need Help?

1. Check the full [README.md](README.md) for detailed instructions
2. View logs for error details
3. Test individual components using health checks
4. Try different API providers to isolate issues

---

**🎉 You're ready to start using AI-powered medical notetaking!** 