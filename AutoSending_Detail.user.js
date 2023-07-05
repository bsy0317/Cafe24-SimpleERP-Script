// ==UserScript==
// @name		AutoSending_Detail.user.js
// @namespace	https://ccnaramall.cafe24.com
// @version		2023062901
// @description	Script for auto-dispatching suppliers from the Order details page
// @author		Seoyeon Bae
// @match		*://*/admin/php/s_new/order_detail.php*
// @icon		https://www.google.com/s2/favicons?sz=64&domain=ccnaramall.cafe24.com
// @updateURL	https://oracle.krr.kr/AutoSending_Detail.user.js
// @downloadURL	https://oracle.krr.kr/AutoSending_Detail.user.js
// @run-at		document-idle
// ==/UserScript==

//var API_SERVER = "https://oracle.krr.kr:3388/api";
var API_SERVER = "http://127.0.0.1:3388/api";

function removeSpace(string) {
    string = string.replace(/(\s)+/g, "$1").replace(/\r\n+/g, "");
    return string;
}

// 주문상세정보 추출 버튼 클릭 이벤트 처리
$('#frm div.mFixNav div div.gRight').append('<a href="#none" id="eOrderSendAPI" class="btnSubmit" style="margin-left:5px"><span style="background-color:#00c925;">주문정보 전송</span></a>');

$('a[id="eOrderSendAPI"]').click(function() {
	if($('input[name="sNewInvoiceNo[]"]').length !== 0){
		alert("발주 완료 후 새로고침이 필요합니다.");
		$('.deliveryInfo').parent().parent().remove();
	}
    var orderDetails = [];
    // wrap 요소 반복 처리
    $('div[id="wrap"]').each(function() {
        var wrapElement = $(this);

        // 주문번호 추출
        var orderNumberElement = wrapElement.find('td:nth-child(2)');
        var orderNumberText = orderNumberElement.clone().children().remove().end().text().trim();
        var orderNumberRegex = /(\d{8}-\d{7})/;
        var orderNumberMatch = orderNumberText.match(orderNumberRegex);
        var orderNumber = orderNumberMatch ? orderNumberMatch[1] : '';

        // 주문일자 추출
        var orderDateElement = wrapElement.find('.gLeft ul:nth-child(2) li:nth-child(2)');
        var orderDateText = orderDateElement.clone().children().remove().end().text().trim();
        var orderDateRegex = /(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})/;
        var orderDateMatch = orderDateText.match(orderDateRegex);
        var orderDate = orderDateMatch ? orderDateMatch[1] : '';

        // 주문내역 추출
        var orderItems = [];
        wrapElement.find('.eChkBody tbody tr').each(function() {
            var gGoods = '';
            var supplier = $(this).find('td:nth-child(3)').text().replace(/\s/g, "");
            $(this).find('li').each(function() {
                gGoods = gGoods + "-" + $(this).text() + "<br>";
            }).text();
			//gGoods = $(this).find('.etc').text().replaceAll('  ','').replaceAll('\n','');
            var product = $(this).find('td:nth-child(4) div p a span').text().trim();
            var quantity = $(this).find('td:nth-child(5)').text().trim();
            var price = $(this).find('td:nth-child(6)').text().trim();
            var subtotal = $(this).find('td:nth-child(7)').text().trim();
            var shippingFee = $(this).find('td:nth-child(9)').text().trim().replace("-", "0");
            var trackingNumber = '';
            var orderStatus = $(this).find('td:nth-child(10) a').text().replace(/\s/g, "");

            var orderItem = {
                supplier: supplier,
                product: product,
				gGoods : gGoods,
                quantity: quantity,
                price: price,
                subtotal: subtotal,
                shippingFee: removeSpace(shippingFee),
                trackingNumber: trackingNumber,
                orderStatus: orderStatus
            };

            orderItems.push(orderItem);
        });

        // 주문자정보 추출
        var ordererInfo = {};
        ordererInfo['휴대전화'] = $('input[name="o_phone2"]').val();
        ordererInfo['일반전화'] = $('input[name="o_phone1"]').val();
        ordererInfo['주문자명(ID)'] = $('input[name="o_name"]').val();

        // 수령자정보 추출
        var recipientInfo = {};
        wrapElement.find('#QA_detail5 .mBoard table tbody tr').each(function() {
            var field1 = $($(this).find('th')[0]).text().trim();
            var field2 = $($(this).find('th')[1]).text().trim();
            var value1 = $($(this).find('td')[0]).text().trim();
            var value2 = $($(this).find('td')[1]).text().trim();
            if (field1 != "") {
                recipientInfo[field1] = removeSpace(value1).replaceAll(" 주문자정보수정 블랙리스트 지정 도움말\n닫기", "").replace(' SMS', '');
            }
            if (field2 != "") {
                recipientInfo[field2] = removeSpace(value2).replaceAll(" 주문자정보수정 블랙리스트 지정 도움말\n닫기", "").replace(' SMS', '');
            }
        });
        recipientInfo['배송구분'] = removeSpace($('#QA_detail5 div.mBoard table tbody tr:nth-child(1) td strong').text().trim());
        recipientInfo['수령자명'] = removeSpace($('#QA_detail5 div.mBoard table tbody tr:nth-child(2) td').text().trim().replace(' 수령자정보수정', ''));
        recipientInfo['일반전화'] = removeSpace($('#QA_detail5 div.mBoard table tbody tr:nth-child(3) input[name=r_phone1]').val().trim());
        recipientInfo['휴대전화'] = removeSpace($('#QA_detail5 div.mBoard table tbody tr:nth-child(3) input[name=r_phone2]').val().trim());
        recipientInfo['배송지 주소'] = removeSpace($('#QA_detail5 div.mBoard table tbody tr:nth-child(4) td').text().trim());
        recipientInfo['배송메시지'] = removeSpace($('#QA_detail5 #DeliveryMemo').val().trim());

        var orderData = {
            orderNumber: orderNumber,
            orderDate: orderDate,
            orderItems: orderItems,
            ordererInfo: ordererInfo,
            recipientInfo: recipientInfo
        };

        orderDetails.push(orderData);
    });
	console.log(orderDetails);
    var json_return = JSON.stringify(orderDetails);
    $.ajax({
        type: 'POST',
        url: API_SERVER,
        data: json_return,
        contentType: 'application/json',
        success: function(response) {
            if (response.message === 'Success') {
                if (!response.errorSupplier || response.errorSupplier.length === 0) {
                    alert('발송완료');
					$('#admin_msg_l').val("발주완료");
					$('#eAdminMemoRegist_l').click();
                } else {
                    var errorSuppliers = response.errorSupplier.join(', ');
                    alert('발송실패\n아래 공급사의 발주가 실패했습니다.\n[' + errorSuppliers + ']\n\n공급사의 이메일이 설정되어있지 않거나 발송금지 대상입니다.');
                }
            } else if (response.errorMessage.length !== 0) {
                alert('발송실패\n' + response.errorMessage);
            } else {
                alert('서버오류가 발생하였습니다.');
            }
        },
        error: function(error) {
            alert('오류 발생: ' + error.responseText);
        }
    });
});