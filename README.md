# [pixivrepositories（pxrepo）](https://www.npmjs.com/package/pxrepo)

## [Version history](https://github.com/EIGHTfs/pxrepo/blob/master/History.md)

## 声明

### \*此项目的源码来自 GitHub 上的开源项目:[Tsuk1ko/pxder](https://github.com/Tsuk1ko/pxder)，为了针对个人体验时的想法进行了修改（因为我没学过nodejs，所以改得贼烂，依葫芦画瓢试出来的，我也很羞愧）

### \*此项目开源

## 准备

首先你需要先[下载](https://nodejs.org/dist/v13.12.0/node-v13.12.0-x64.msi) 安装 [Nodejs](https://nodejs.org/zh-cn/)

## Linux
```bash
### Ubuntu

curl -sL https://deb.nodesource.com/setup_12.x | sudo -E bash -
sudo apt-get install -y nodejs

### Debian

curl -sL https://deb.nodesource.com/setup_12.x | bash -
apt-get install -y nodejs

### Centos

curl -sL https://rpm.nodesource.com/setup_12.x | bash -
yum install nodejs -y
```
## 安装/更新/卸载

### 安装

```bash
npm i -g pixivrepositories
```

### 卸载

```bash
npm uninstall -g pixivrepositories
```

## 配置

### 登录

```bash
pxrepo --login
```

注：pxrepo 仅会在计算机上储存 refreshAccessToken，而不会储存您的帐号密码

如果要登出

```bash
pxrepo --logout
```

### 设置

进入 Pxrepo 的设置界面

```bash
pxrepo --setting
```

有五项设置，按下数字键选择一项进行设置，然后按照要求输入之后回车即可

```bash
[1] Download path     # 下载目录，必须设置
[2] Download thread   # 下载线程数
[3] Auto rename       # 自动重命名（文件夹）
[4] Proxy             # 使用代理
```

- **下载目录**  
  请注意相对路径与绝对路径的区别，不过不用担心，输入完路径后会显示绝对路径以方便你检查  
  目录无需手动建立，下载图片的时候会自动建立
- **下载线程数**  
  即同时下载的图片数，默认为`32`，最小为`1`，最大为`90`  
  下载图片时最左侧的一列实际上就是线程编号
- **自动重命名**  
  默认开启,开启了以后，例如这个画师原来叫`abc`，今天你再次去下载（更新）他的画作，但是他改名叫`def`了，那么程序会自动帮你重命名画师文件夹
- **使用代理**  
  支持使用 HTTP 或 SOCKS 代理，即可以使用小飞机  
  输入格式为`<协议>://[用户名:密码@]<IP>:<端口>`，例如：
  - `http://user:passwd@127.0.0.1:1080`
  - `socks://127.0.0.1:1080`

禁止使用代理，请输入`disable`

## 功能

    .option('--login', 'login Pixiv')
    .option('--logout', 'logout Pixiv')

    .option('--setting', 'open options menu')
    .option('')
    .option('-p, --pid <pid(s)>', 'download illusts by PID, multiple PIDs separated by commas (,)')
    .option('-u, --uid <uid(s)>', 'download / update illusts by UID, multiple UIDs separated by commas (,)')
    .option('')
    .option('-f, --follow', 'download / update illusts from your public follows')
    .option('-F, --follow-private', 'download / update illusts from your private follows')
    .option('-C, --shift', 'follows.shift()')

    .option('-b, --bookmark', 'download / update illusts from your public bookmark')
    .option('-B, --bookmark-private', 'download / update illusts from your private bookmark')
    .option('')
    .option('-U, --update', "update illustrators' illusts in your download path")
    	.option('    --aptend', 'add illustrators in downloadJson')
    	.option('    --force', 'ignore blacklist')
    .option('    --repair', 'download illusts from your download history')

    .option('-D, --delete', 'delete illustrators\' illusts in your download temp path')

    .option('    --no-cf', 'download illusts from i.pximg.net instead of i-cf.pximg.net')

    .option('    --debug', 'output all error messages while running')

    .option('-l, --blacklist <uid(s)>', 'Add the illusts to the blacklist')

## 对 pxder 的修改

`pxder -f` `pxder -F`

#### 分别会创建`public.json`或`private.json`，获取完指定的所有关注列表开始下载，若已存在文件便直接开始下载

`pxrepo -f` `pxrepo -F`

#### 创建`download.json`，获取关注时每获取一批（30 个)就写入一次，而且若已存在文件也可以提供附加参数`--aptend`继续获取新的关注列表追加`download.json`

`pxder -U`

#### 读取所有下载的画师进行更新

`pxrepo -U`

#### 读取所有下载的画师,写入到`download.json`然后进行更新

`pxder --setting`

#### 能够设置超时时间，下载线程默认 5，最大 32

`pxrepo --setting`

#### 不能够设置超时时间，默认设置 25s 超时。线程上限提高了，可以设置到 90，默认为 32，注意这里设置的线程数实际上是个基准，在此基础上会根据网络，图片数量增加最多为 10 的线程数

### 其他方面

#### 缓存目录和程序目录位于同一个文件夹下，下载会在缓存目录下再创建格式为"(" + id + ")"的文件夹。不再是直接都放在整个缓存目录，运行时不会删掉缓存目录 (`pxrepo -D`可以删除缓存目录里面所有文件)

#### 增加黑名单功能，原理：手动`pxrepo -l`添加画师 ID 拉入“黑名单”，每次下载前都会检查欲下载的画师的 ID 是否存在于`blacklist.json`，存在就跳过。默认值`[{"id":11}]`

#### 我觉得必要的时候暂停 15s，防止 Rate Limit 出现。

#### 可以`pxrepo -C`手动跳过当前`download.json`的第一个画师

```bash
{
  error: {
    user_message: 'Your access is currently restricted.',
    message: '',
    reason: '',
    user_message_details: {}
  }
}
```

## 参数说明

### 指定画作 ID 下载画作

#### 插画会被下载至`PID`文件夹中

```bash
'-p, --pid <pid(s)>'
```

### 指定画师 UD 下载该画师未下载的一次不超过 5000 张画作

```bash
'-u, --uid <uid(s)>'
```

### 获取公开关注列表中最新关注的 5000 名画师，获取其画作下载

#### 可配合`--aptend`对`download.json`进行增量更新，默认为新获取数据覆盖`download.json`

`download.json`即为获取的画师信息列表，是 pxrepo 的下载列表

```bash
'-f, --follow'
```

### 获取私密关注列表中最新关注的 5000 名画师，获取其画作下载

#### 可配合`--aptend`对`download.json`进行增量更新，默认为新获取数据覆盖`download.json`

`download.json`即为获取的画师信息列表，是 pxrepo 的下载列表

```bash
'-F, --follow-private'
```

### \*取消当前第一个画师下载任务，一般用于个别画师出现的无法进行下载时跳过

```bash
'-C, --shift'
```

### 更新你的公开收藏中的插画作品

#### 插画会被下载至`[bookmark] Public`文件夹中

```bash
'-b, --bookmark'
```

### 更新你的私密收藏中的插画作品

#### 插画会被下载至`[bookmark] Private`文件夹中

```bash
'-B, --bookmark-private'
```

### 更新已下载的画师的画作

#### 可配合`--aptend`对`download.json`进行增量更新，默认为新获取数据覆盖`download.json`

`download.json`即为获取的画师信息列表，是 pxrepo 的下载列表

```bash
'-U, --update'
```

### \*找回历史下载的画师及画作

#### 如果不小心把下载目录的文件删除了，只要保有`history.json`即可下载回来

#### 原理是每次使用`'-U, --update'`更新画作会将所有`history.json`中不存在的画师 ID 信息写入其中

#### 通过保留下载过的画师 ID 进行再次下载

```bash
'    --repair'
```

### \*删除缓存目录下所有文件

```bash
'-D, --delete'
```

### \*将不喜欢的画师拉入黑名单

```bash
'-l, --blacklist <uid(s)>'
```
