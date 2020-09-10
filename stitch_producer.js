const express = require("express");
const { Kafka } = require('kafkajs');
const fetch = require("node-fetch");

const app = express();
app.use(express.json())

const kafka = new Kafka({
    clientId: 'stitch',
    brokers: ["localhost:9092"]
})

const producer = kafka.producer();

const port = process.env.PORT || 8182;
const adminSecret = process.env.adminSecret || "cuerate";
const STATE_READY = "ready-to-publish";
const STATE_DONE = "done";
const STATE_PROCESSING = "processing";

const graphql_query = (query, variables) => {
    const url = "https://cuerate.herokuapp.com/v1/graphql";
    const headers = {
        "content-type": "application/json",
        "x-hasura-admin-secret": adminSecret
    }
    return fetch(url, {
        method: "POST",
        headers: headers,
        body: JSON.stringify({
            query,
            variables
        })
    }).then(response => {
        if (!response.status || response.status != 200) {
	    console.error("Received non-200 http status from Hasura GraphQL Endpoint");
	    throw new Error("Received non-200 http status from GraphQL server");
        }
        return response.json();
    }).then(responseJson => {
        console.log("responseJson: ", responseJson);
        return responseJson.data;
    });
};


app.get("/", (req,res)=>{
    res.send("Up")
})

app.post("/upload-complete",(req,res)=>{
   const userId = req.body.userId || "";
   const threadId = req.body.threadId || "";
   const postId = req.body.postId || ""; 
   const codevideoObjectName = req.body.codevideoObjectName || "";
   const usermediaObjectName = req.body.usermediaObjectName || "";
   const query = 'mutation MyMutation($id: Int!, $state: String) { update_post_by_pk(pk_columns: {id: $id}, _set: {state: $state}) { id post_type state } }';
   const variables = {
        "id": postId,
	"state": STATE_PROCESSING
   };
   graphql_query(query, variables).then(data => {
        console.log("data: ", JSON.stringify(data));
	const post = data.update_post_by_pk;
	if (post == null) {
	    console.error("Received empty response for the post update mutation. Make sure post id #", postId, "is valid");
	    throw new Error("Something went wrong while processing the post");
	}
	console.log("Post state has been set to ", STATE_PROCESSING);
   }).catch(err => {
        console.error("Error: ", err)
        return res.status(500).json({
            status: 500,
	    response: err.message
	});
   });

   producer.connect()
   .then(() =>
    producer.send({
       topic: 'stitch_video_objects',
       messages: [{
          key: JSON.stringify({
               userId
          }),
          value: JSON.stringify({threadId, postId, codevideoObjectName, usermediaObjectName}),
      }],
    })
   ).then(() => {
        producer.disconnect();
    }).then(() => {
        console.log("Successfully inserted stitch video objects of #", postId," belonging to ", userId," to kafka");
	return res.status(200).json({
	    "status":"success",
	    "response":"Successfully passed the video for processing"
	})
      }).catch(err => {
	    console.error("Error while sending the stitch video objects of #", postId, " belonging to ", userId, " to kafka");
	    console.error(err);
            return res.status(500).json({
		"status":"error",
		"response":"Error occurred while sending the video for processing"
	    })
        });
});

app.post("/ready-to-publish",(req,res) => {
    const threadId = req.body.threadId || "";
    const query = 'mutation MyMutation($state: String = "", $id: Int!) { update_thread_by_pk(pk_columns: {id: $id}, _set: {state: $state}) { posts { id state } id state user_id } }';
    let variables = {
        "id": threadId,
	"state": STATE_READY
    }
    let response_message = '';

    graphql_query(query, variables).then(data => {
	console.log("data: ", JSON.stringify(data));
	const thread = data.update_thread_by_pk;
	if (thread == null) {
	    console.error("Received empty response for the thread update mutation. Make sure thread id #", threadId, "is valid");
	    throw new Error("Something went wrong while processing the thread");
	}
	undone_post = thread.posts.find(post => post.state != 'done');
	console.log(undone_post);
	if (undone_post === undefined) {
	    console.log("Setting");
	    variables["state"] = STATE_DONE
	    graphql_query(query, variables).then(data => {
		console.log("data: ", JSON.stringify(data));
		const thread = data["update_thread_by_pk"];
		if (thread == null) {
		    console.error("Received empty response for the thread update mutation. Check the permissions in GraphQL server.");
		    throw new Error("Something went wrong while processing the thread");
		}
		console.log("Thread #", threadId, "is published");
		response_message = "All posts of the thread are published";
		return res.status(200).json({
		    status: "success",
		    response: response_message
		});
	    });
	} else {
	    response_message = "Some posts of the thread are still processing. The thread will be published in a while.";
	    return res.status(200).json({
	        status: "success",
	       response: response_message
	    });
	}
    }).catch(err => {
	console.error("Error: ", err)
	return res.status(500).json({
	    status: 500,
	    response: err.message
	})
    });
    
});

app.listen(port,()=>{
    console.log("Listening on port ", port);
})
