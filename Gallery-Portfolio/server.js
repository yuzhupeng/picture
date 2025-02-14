const express = require('express');
const session = require('express-session'); // 添加 session 管理
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');
 
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

const IMAGE_DIR = process.env.IMAGE_DIR || path.join(__dirname, 'pt');
const IMAGE_COMPRESSION_QUALITY = parseInt(process.env.IMAGE_COMPRESSION_QUALITY, 10) || 80;
const validImageExtensions = ['.jpg', '.jpeg', '.png', '.gif'];

app.use(express.static('public')); // 提供静态资源（包含 login.html、index.html）
app.use(express.json()); // 解析 JSON 请求
app.use(express.urlencoded({ extended: true })); // 解析表单数据

// **Session 配置**
app.use(session({
    secret: 'your_secret_key', // 请替换为更安全的密钥
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // 如果启用 HTTPS，请改为 true
}));

// **默认重定向到登录页**
app.get('/', (req, res) => {
    if (req.session.isAuthenticated) {
        res.redirect('/index.html'); // 已登录，跳转主页
    } else {
        res.redirect('/login.html'); // 未登录，跳转登录页
    }
});

// **登录接口**
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    
    if (username === 'admin' && password === '123456') { // 这里可换成数据库验证
        req.session.isAuthenticated = true;
        res.json({ success: true, message: "登录成功" });
    } else {
        res.status(401).json({ success: false, message: "用户名或密码错误" });
    }
});

app.get('/config', (req, res) => {
  res.json({ IMAGE_BASE_URL: `http://localhost:${port}/images` });
});

// **登出接口**
app.post('/logout', (req, res) => {
    req.session.destroy(() => {
        res.json({ success: true, message: "已登出" });
    });
});

// **获取图片列表**
app.get('/images', (req, res) => {
    if (!req.session.isAuthenticated) {
 
        return res.status(401).json({ success: false, message: "请先登录" });
    }

    try {
        const images = fs.readdirSync(IMAGE_DIR);
        const imageMap = images.filter(file => validImageExtensions.includes(path.extname(file).toLowerCase()))
            .map(file => ({
                original: `/images/${file}`,
                thumbnail: `/thumbnail/${file}`
            }));

        res.json({ all: imageMap });
    } catch (error) {
        console.error('Error loading images:', error);
        res.status(500).send('Error loading images');
    }
});

// **提供图片**
app.get('/images/:imageName', (req, res) => {
    if (!req.session.isAuthenticated) {
        return res.status(401).send('请先登录');
    }

    const imagePath = path.join(IMAGE_DIR, req.params.imageName);
    if (!fs.existsSync(imagePath)) {
        return res.status(404).send('Image not found');
    }
    res.sendFile(imagePath);
});

// **生成并提供缩略图**
app.get('/thumbnail/:imageName', async (req, res) => {
    if (!req.session.isAuthenticated) {
        return res.status(401).send('请先登录');
    }

    const imagePath = path.join(IMAGE_DIR, req.params.imageName);
    const thumbnailDir = path.join(IMAGE_DIR, 'preview');
    const thumbnailPath = path.join(thumbnailDir, req.params.imageName);

    try {
        if (!fs.existsSync(thumbnailDir)) {
            fs.mkdirSync(thumbnailDir);
        }

        if (!fs.existsSync(thumbnailPath)) {
            const sharpInstance = sharp(imagePath).resize(200).jpeg({ quality: IMAGE_COMPRESSION_QUALITY });
            const thumbnailBuffer = await sharpInstance.toBuffer();
            fs.writeFileSync(thumbnailPath, thumbnailBuffer);
        }

        res.sendFile(thumbnailPath);
    } catch (error) {
        console.error('Error generating thumbnail:', error);
        res.status(500).send('Error generating thumbnail');
    }
});

// **启动服务器**
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
