# 内容怎么改

站点的所有文字和图片路径都在 `content/content.json` 里。改这个文件、push，一两分钟后线上就更新了。
不需要登录任何后台，也不用令牌。

## 加一个项目

在 `projects.items` 数组里加一项：

```json
{
  "id": "my-project",
  "name": "项目名",
  "summary": "一句话介绍，卡片上显示",
  "tags": ["Python", "ROS"],
  "image": "assets/img/my-project.svg",
  "detail": "详情弹层里的长一点的介绍，可以换行写 \\n",
  "meta": [["年份", "2026"], ["参与", "4 人"], ["状态", "运行中"]]
}
```

然后把图片放到 `assets/img/`，`image` 写相对路径。图片比例建议 16:10，SVG 或 JPG/PNG 都行。

## 加一位成员

`members.items` 里加一项：

```json
{ "name": "张三", "role": "方向 · 年级", "initial": "张" }
```

## 加一条时间线

`timeline.items` 里加一项，顺序按你要展示的顺序排：

```json
{ "year": "2027", "title": "标题", "desc": "一两句话" }
```

## 换首屏大标题

`hero.title` 是两行文字，第一行描边、第二行实心。`hero.lead` 是那句定位语。

## 换导航

`nav` 数组，`href` 用 `#what`、`#works`、`#timeline`、`#join` 这几个锚点。

## 注意

- JSON 不能写注释，逗号别多别少，引号用英文双引号
- 改完刷新页面看效果；线上要等 GitHub Pages 重新构建（约半分钟到一分钟）
- 图片文件别太大，单张控制在 500KB 以内
