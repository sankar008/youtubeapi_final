const { jsPDF } = require("jspdf");
const randomUseragent = require('random-useragent');

//Enable stealth mode
const puppeteer = require('puppeteer-extra')
const StealthPlugin = require('puppeteer-extra-plugin-stealth')
puppeteer.use(StealthPlugin())

const youtubeModel = require("./youtube.service");

const createPdf = async (req, res) => {
    const body = req.body;
    const youtubeURL = body.link;
   
    const status = saveData();
    
    
}




const saveData = async (req, res) => {
    const body = req.body
    const youtube = new youtubeModel({
      userId: body.userId,
      link: body.link,
      title: body.title
    })
    const result = await youtube .save();
    return res.status(200).json({
      success: 1,
      data: result,
      progress: 10
  })
}

const generatePdf = async (req, res) => {
    
    const captureData = [];
    let start = new Date();
    let figWidth;
    let figHeight;
    const youtubeId = await youtubeModel.findOne({_id: req.params.id}, {link:1}); 
    if(youtubeId.link != ''){
      var youtubeURL = youtubeId.link;
    }else{
      return res.status(400).json({
        success: 0,
        msg: "Link not found"
      })
    }
   
   try {
    const browser = await puppeteer.launch({headless: true, executablePath: '/usr/bin/chromium-browser', args: ['--no-sandbox']});

   // const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/73.0.3683.75 Safari/537.36';
   // const userAgent = randomUseragent.getRandom();
   // const UA = userAgent || USER_AGENT;

  

    const page = await browser.newPage();
//    await page.setUserAgent(UA);
    await page.setViewport({ width: 1920, height: 1080 });

    await page.goto(`${youtubeURL}&t=5`, {
      waitUntil: "networkidle2",
      timeout: 0
    });


//return res.write(await page.content());

    // get video component
    await page.waitForSelector(".html5-main-video");
    const videoEle = await page.$(".html5-main-video");

    // get video size
    figWidth = await page.evaluate((video) => {
      // 여기 내부에서 실행되는건 브라우저상에서 실행되는거라, node 상으로 반영 안된다.
      return video.videoWidth;
    }, videoEle);

    figHeight = await page.evaluate((video) => {
      return video.videoHeight;
    }, videoEle);

    if ((await page.$(".paused-mode")) !== null) {
      await page.keyboard.press("k");
      await page.waitForTimeout(200);
    }

    // ad skip
    try {
      while ((await page.$(".ad-showing")) !== null) {
        await page.waitForSelector(".buffering-mode", { hidden: true });
        if ((await page.$(".paused-mode")) !== null) {
          await page.keyboard.press("k");
        }
        await page.waitForTimeout(200);
        if ((await page.$(".ytp-ad-skip-button")) !== null) {
          const skipButton = await page.$(".ytp-ad-skip-button");
          await skipButton.click();
        }
      }
    } catch (e) {
      console.log("광고 스킵하는 부분에서 에러발생");
    }

    // get video length
    const timeEle = await page.$(".ytp-bound-time-right");
    const lenText = await timeEle.evaluate((ele) => {
      return ele.innerHTML;
    }, timeEle);
    const lenArray = lenText.split(":");
    let videoLength;
    if (lenArray[0] === "0") {
      console.log("too short!");
      console.log(lenArray);
    } else if (lenArray.length == 2) {
      console.log("under 1 hour video");
      videoLength = parseInt(lenArray[0], 10);
    } else if (lenArray.length == 3) {
      console.log("over 1 hour video");
      videoLength = parseInt(lenArray[0], 10) * 60 + parseInt(lenArray[1], 10);
    } else {
      console.log("exeptional case");
    }

    // caption on
    const captionBtn = await page.$(".ytp-subtitles-button");
    const captionOn = await page.evaluate(
      (el) => el.getAttribute("aria-pressed"),
      captionBtn
    );
    if (captionOn == "false") {
      await captionBtn.click();
    }

    // start screenshot
    for (let i = 0; i < videoLength + 1; i++) {
      await page.waitForSelector(".buffering-mode", { hidden: true });

      try {
        await page.waitForFunction(
          `document.querySelector('.ytp-spinner') && document.querySelector('.ytp-spinner').style.display=='none'`
        );
      } catch (e) {
        console.log("스피너 대기하는곳에서 에러발생");
      }

      // ad skip
      try {
        while ((await page.$(".ad-showing")) !== null) {
          await page.waitForSelector(".buffering-mode", { hidden: true });
          if ((await page.$(".paused-mode")) !== null) {
            await page.keyboard.press("k");
          }
          await page.waitForTimeout(6000);
          if ((await page.$(".ytp-ad-skip-button")) !== null) {
            const skipButton = await page.$(".ytp-ad-skip-button");
            await skipButton.click();
          }
        }
      } catch (e) {
        console.log("광고 스킵하는 부분에서 에러발생");
      }

      await page.waitForSelector(".buffering-mode", { hidden: true });

      // close overlay ad
      try {
        if ((await page.$(".ytp-ad-overlay-close-button")) !== null) {
          const adCloseBtns = await page.$$(".ytp-ad-overlay-close-button");
          await adCloseBtns[adCloseBtns.length - 1].click();
        }
      } catch (e) {
        console.log("오버레이 광고 끄는 부분에서 에러 발생");
      }

      try {
        if ((await page.$(".playing-mode")) !== null) {
          await page.keyboard.press("k");
          await page.waitForTimeout(200);
        }
      } catch (e) {
        console.log("플레잉 모드인거 재생멈춤 하는데서 에러발생");
      }

      await page.waitForSelector(".buffering-mode", { hidden: true });

      
      captureData.push(
        await videoEle.screenshot({
          type: "jpeg",
          encoding: "base64",
        })
      );

      
      await page.keyboard.press("l");
      await page.keyboard.press("l");
      await page.keyboard.press("l");
      await page.keyboard.press("l");
      await page.keyboard.press("l");
      await page.keyboard.press("l");
      await page.waitForTimeout(100);
      await page.waitForSelector(".buffering-mode", { hidden: true });
      try {
        await page.waitForFunction(
          `document.querySelector('.ytp-spinner') && document.querySelector('.ytp-spinner').style.display=='none'`
        );
      } catch (e) {
        console.log("맨 마지막 스피너 기다리는데서 에러발생");
      }
      try {
        await page.waitForFunction(
          `document.querySelector('.ytp-bezel-text-hide') && document.querySelector('.ytp-bezel-text-hide').style.display=='none'`
        );
      } catch (e) {
        console.log("맨 마지막 화살표 없어지는거 기다리는데서 에러발생");
      }
    }

    await browser.close();
    // make pdf file
    const doc = new jsPDF("l", "pt", [figWidth, figHeight]);
    for (let i = 0; i < captureData.length; i++) {
      doc.addImage(captureData[i], "JPEG", 0, 0, figWidth, figHeight); //이미지 그리기
      if (i == captureData.length - 1) {
      } else {
        doc.addPage();
      }
    }

    // const pdfName = `./pdf.webdevelopments.in/upload/glancer-${Date.now()}.pdf`;
    // const dbpdfName = `/upload/glancer-${Date.now()}.pdf`;

    const pdfName = `./upload/youtube-${Date.now()}.pdf`;
    const dbpdfName = `/upload/youtube-${Date.now()}.pdf`;

    doc.save(pdfName);
    return res.status(200).json({
      success: 1,
      data: dbpdfName,
      progress: 70
     })
    

  } catch (e) {
    console.log(e);
  }   
}

const savePdf = async (req, res) => { 
  const body = req.body;
  try{
    const pdf = await youtubeModel.findOneAndUpdate({"_id": body.id}, {image: body.image });
    return res.status(200).json({
      success: 1,
      msg: "Update successfull",
      progress: 100
    })
  }catch(e){
    return res.status(400).json({
      success: 0,
      msg: e
    })
  }

}




const getPdf = async (req, res) => {
    
    const userId = req.params.id;

    try{
        const data = await youtubeModel.find({userId:req.params.id})
        return res.status(200).json({
            success: 1,
            data: data
        })
    }
    catch(errors){
        return res.status(400).send(errors);
    }

}

const deletePdf = (req, res) => {
    
}

module.exports = {
    createPdf: createPdf,
    saveData: saveData,
    generatePdf: generatePdf,
    getPdf: getPdf,
    savePdf: savePdf,
    deletePdf: deletePdf,
}
